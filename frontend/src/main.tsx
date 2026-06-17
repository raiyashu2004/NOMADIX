import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import "./index.css"
import "./styles/theme.css";
const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element not found")
}

createRoot(rootElement).render(
  <BrowserRouter>
  <div className="min-h-screen bg-background text-text">
      <App />
  </div>
  </BrowserRouter>
)