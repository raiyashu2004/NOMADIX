"""
FastAPI Bill Scanner — Optimized for RTX 3050 4GB VRAM
======================================================
Primary model:  Qwen2.5-VL-3B-Instruct  (4-bit, bitsandbytes)
Fallback model: vikhyatk/moondream2       (1.6B, float16)

Key 4GB survival tricks:
  • 4-bit quantization via BitsAndBytesConfig
  • max_pixels capped at 256×256 = 65 536 to shrink vision encoder activations
  • torch.cuda.empty_cache() after every inference
  • offload_folder for partial CPU offload if needed
"""

import io
import gc
import json
import logging
import traceback
from contextlib import asynccontextmanager

import torch
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("bill_scanner")

# ---------------------------------------------------------------------------
# Global model / processor handles
# ---------------------------------------------------------------------------
model = None
processor = None
active_model_name: str = "none"

# Resolution cap — THE critical OOM prevention knob for 4 GB VRAM.
# 256×256 = 65 536 pixels.  Low, but keeps the vision encoder under budget.
MAX_PIXELS = 256 * 256
MIN_PIXELS = 64 * 64

# Offload directory for accelerate (CPU RAM spillover)
OFFLOAD_DIR = "./offload_weights"

# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------
EXTRACTION_PROMPT = """You are a receipt/bill parser. Analyze this receipt image and extract the following information in valid JSON format:

{
  "restaurant_name": "name of the restaurant or store",
  "items": [
    {"name": "item name", "price": 0.00}
  ],
  "total": 0.00
}

Rules:
- Extract ALL items with their prices.
- Prices must be numbers (float), not strings.
- If you cannot read a field, set it to null.
- Return ONLY the JSON object, no extra text.
"""


# ---------------------------------------------------------------------------
# Model loading helpers
# ---------------------------------------------------------------------------
def _load_qwen() -> bool:
    """Attempt to load Qwen2.5-VL-3B-Instruct in 4-bit."""
    global model, processor, active_model_name

    try:
        from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor, BitsAndBytesConfig

        logger.info("Loading Qwen2.5-VL-3B-Instruct (4-bit) …")

        quant_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
        )

        model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            "Qwen/Qwen2.5-VL-3B-Instruct",
            quantization_config=quant_config,
            torch_dtype=torch.float16,
            device_map="auto",
            offload_folder=OFFLOAD_DIR,
        )

        processor = AutoProcessor.from_pretrained(
            "Qwen/Qwen2.5-VL-3B-Instruct",
            min_pixels=MIN_PIXELS,
            max_pixels=MAX_PIXELS,
        )

        active_model_name = "Qwen2.5-VL-3B-Instruct-4bit"
        logger.info("✅ Qwen loaded successfully.")
        return True

    except Exception as exc:
        logger.error(f"❌ Qwen load failed: {exc}")
        traceback.print_exc()
        # Free whatever was partially allocated
        _unload_model()
        return False


def _load_moondream() -> bool:
    """Fallback: load Moondream2 (1.6B) — much safer on 4 GB."""
    global model, processor, active_model_name

    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer

        logger.info("Loading Moondream2 fallback (1.6B, float16) …")

        model = AutoModelForCausalLM.from_pretrained(
            "vikhyatk/moondream2",
            trust_remote_code=True,
            torch_dtype=torch.float16,
            device_map="auto",
            offload_folder=OFFLOAD_DIR,
        )

        processor = AutoTokenizer.from_pretrained(
            "vikhyatk/moondream2",
            trust_remote_code=True,
        )

        active_model_name = "moondream2-1.6B-fp16"
        logger.info("✅ Moondream2 loaded successfully.")
        return True

    except Exception as exc:
        logger.error(f"❌ Moondream2 load also failed: {exc}")
        traceback.print_exc()
        _unload_model()
        return False


def _unload_model():
    """Release GPU memory aggressively."""
    global model, processor
    del model
    del processor
    model = None
    processor = None
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------
def _infer_qwen(image: Image.Image) -> str:
    """Run inference with the Qwen2.5-VL pipeline."""
    from qwen_vl_utils import process_vision_info

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image, "min_pixels": MIN_PIXELS, "max_pixels": MAX_PIXELS},
                {"type": "text", "text": EXTRACTION_PROMPT},
            ],
        }
    ]

    text_input = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)

    inputs = processor(
        text=[text_input],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt",
    ).to(model.device)

    with torch.no_grad():
        output_ids = model.generate(**inputs, max_new_tokens=1024, do_sample=False)

    # Strip the prompt tokens from the output
    generated_ids = output_ids[:, inputs.input_ids.shape[1]:]
    result = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return result


def _infer_moondream(image: Image.Image) -> str:
    """Run inference with Moondream2."""
    enc_image = model.encode_image(image)
    result = model.answer_question(enc_image, EXTRACTION_PROMPT, processor)
    return result


def _flush_vram():
    """Post-inference VRAM cleanup — critical on 4 GB."""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        allocated = torch.cuda.memory_allocated() / 1024**2
        reserved = torch.cuda.memory_reserved() / 1024**2
        logger.info(f"VRAM after flush → allocated: {allocated:.0f} MB | reserved: {reserved:.0f} MB")


# ---------------------------------------------------------------------------
# FastAPI lifespan (startup / shutdown)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- Startup ----
    logger.info("=" * 60)
    logger.info("Bill Scanner starting up …")

    if torch.cuda.is_available():
        gpu = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_mem / 1024**3
        logger.info(f"GPU detected: {gpu} ({vram:.1f} GB)")
    else:
        logger.warning("No CUDA GPU detected — inference will be very slow or fail.")

    # Try Qwen first, fall back to Moondream
    if not _load_qwen():
        logger.warning("Falling back to Moondream2 …")
        if not _load_moondream():
            logger.error("No model could be loaded. /scan will return 503.")

    yield

    # ---- Shutdown ----
    logger.info("Shutting down — releasing VRAM …")
    _unload_model()


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Bill Scanner API",
    description="Upload a receipt image → get structured JSON (restaurant, items, prices, total). "
                "Optimized for RTX 3050 4 GB VRAM.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/")
async def root():
    """Health check + model status."""
    vram_info = {}
    if torch.cuda.is_available():
        vram_info = {
            "gpu": torch.cuda.get_device_name(0),
            "allocated_MB": round(torch.cuda.memory_allocated() / 1024**2),
            "reserved_MB": round(torch.cuda.memory_reserved() / 1024**2),
        }

    return {
        "status": "running",
        "active_model": active_model_name,
        "max_pixels": MAX_PIXELS,
        "vram": vram_info,
    }


@app.post("/scan")
async def scan_receipt(file: UploadFile = File(...)):
    """
    Upload a receipt/bill image → structured JSON.

    Returns:
        {
          "restaurant_name": str | null,
          "items": [{"name": str, "price": float}, ...],
          "total": float | null,
          "model_used": str
        }
    """
    if model is None:
        raise HTTPException(status_code=503, detail="No model is loaded. Check server logs.")

    # --- Read & validate image ---
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Expected an image file, got {content_type}")

    try:
        raw = await file.read()
        image = Image.open(io.BytesIO(raw)).convert("RGB")
        logger.info(f"Received image: {file.filename} | size: {image.size} | {len(raw) / 1024:.1f} KB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read image: {exc}")

    # --- Pre-resize (safety net — shrink before it even hits the processor) ---
    if image.width * image.height > MAX_PIXELS:
        ratio = (MAX_PIXELS / (image.width * image.height)) ** 0.5
        new_w = max(1, int(image.width * ratio))
        new_h = max(1, int(image.height * ratio))
        image = image.resize((new_w, new_h), Image.LANCZOS)
        logger.info(f"Pre-resized to {image.size} to stay within {MAX_PIXELS} px budget")

    # --- Inference ---
    try:
        if "qwen" in active_model_name.lower():
            raw_output = _infer_qwen(image)
        elif "moondream" in active_model_name.lower():
            raw_output = _infer_moondream(image)
        else:
            raise HTTPException(status_code=500, detail=f"Unknown model: {active_model_name}")
    except torch.cuda.OutOfMemoryError:
        _flush_vram()
        raise HTTPException(
            status_code=503,
            detail="CUDA Out of Memory even with 256×256 limit. "
                   "Restart the server — it will try the Moondream2 fallback.",
        )
    except Exception as exc:
        _flush_vram()
        logger.error(f"Inference error: {exc}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}")
    finally:
        _flush_vram()   # always reclaim VRAM

    logger.info(f"Raw model output:\n{raw_output}")

    # --- Parse JSON from model output ---
    parsed = _extract_json(raw_output)
    parsed["model_used"] = active_model_name

    return JSONResponse(content=parsed)


def _extract_json(text: str) -> dict:
    """
    Best-effort JSON extraction from model output.
    Handles markdown code fences, leading/trailing garbage, etc.
    """
    import re

    # Strip markdown code fences
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    text = text.strip()

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find the first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Give up — return raw text so the caller still gets something useful
    logger.warning("Could not parse JSON from model output, returning raw text.")
    return {
        "restaurant_name": None,
        "items": [],
        "total": None,
        "raw_output": text,
        "parse_error": "Model output was not valid JSON",
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,   # reload=True leaks VRAM on restarts
    )
