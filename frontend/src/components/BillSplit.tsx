import { useState } from "react"
import {
  DndContext,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core"

import type { DragEndEvent } from "@dnd-kit/core"

/* =========================
   Types
========================= */

type Item = {
  id: string
  label: string
}

type Assignments = {
  [key: string]: string[]
}

type DraggableItemProps = {
  id: string
  label: string
}

type DropZoneProps = {
  id: string
  label: string
  assignedItems: Item[]
}

/* =========================
   Draggable Item
========================= */

function DraggableItem({ id, label }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
  })

  const style: React.CSSProperties | undefined = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 transition border shadow-sm border-border bg-card rounded-xl cursor-grab text-text hover:shadow-md"
    >
      {label}
    </div>
  )
}

/* =========================
   Drop Zone
========================= */

function DropZone({ id, label, assignedItems }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`
        border p-4 min-h-[120px] rounded-2xl transition
        ${isOver ? "bg-accent/10 border-accent" : "bg-card border-border"}
      `}
    >
      <p className="mb-3 font-semibold text-primary">
        {label}
      </p>

      {assignedItems.length === 0 ? (
        <div className="text-sm text-muted">
          Drag items here
        </div>
      ) : (
        <div className="space-y-2">
          {assignedItems.map((item) => (
            <div
              key={item.id}
              className="p-2 text-sm border rounded-lg border-border bg-background"
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* =========================
   Main Component
========================= */

export default function BillSplit() {
  const [assignments, setAssignments] = useState<Assignments>({
    u1: [],
    u2: [],
  })

  const items: Item[] = [
    { id: "i1", label: "Coffee $4.50" },
    { id: "i2", label: "Sandwich $7.20" },
  ]

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    setAssignments((prev) => {
      // prevent duplicate assignment
      const alreadyAssigned = Object.values(prev).some((arr) =>
        arr.includes(active.id as string)
      )

      if (alreadyAssigned) return prev

      return {
        ...prev,
        [over.id as string]: [
          ...prev[over.id as string],
          active.id as string,
        ],
      }
    })
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="grid gap-8 p-4 md:grid-cols-2">

        {/* Items */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">
            Items
          </h2>

          {items.map((item) => (
            <DraggableItem
              key={item.id}
              id={item.id}
              label={item.label}
            />
          ))}
        </div>

        {/* Users */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-primary">
            Assign to Users
          </h2>

          <DropZone
            id="u1"
            label="User 1"
            assignedItems={items.filter((item) =>
              assignments.u1.includes(item.id)
            )}
          />

          <DropZone
            id="u2"
            label="User 2"
            assignedItems={items.filter((item) =>
              assignments.u2.includes(item.id)
            )}
          />
        </div>

      </div>
    </DndContext>
  )
}