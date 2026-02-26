export default function ItineraryTimeline() {
  const items = [
    { time: "09:00", label: "Meet at Station" },
    { time: "10:30", label: "Train to City" },
    { time: "12:00", label: "Lunch" },
  ]

  return (
    <div className="relative space-y-6">

      {/* Vertical Line */}
      <div className="absolute top-0 left-20 h-full w-[2px] bg-border"></div>

      {items.map((it, i) => (
        <div key={i} className="relative flex items-start gap-6">

          {/* Time */}
          <div className="w-16 text-sm font-medium text-muted">
            {it.time}
          </div>

          {/* Dot */}
          <div className="relative z-10 flex items-center justify-center w-4 h-4 rounded-full shadow-sm bg-primary">
          </div>

          {/* Content */}
          <div className="flex-1 pb-6">
            <div className="text-sm font-medium text-text">
              {it.label}
            </div>
          </div>

        </div>
      ))}
    </div>
  )
}