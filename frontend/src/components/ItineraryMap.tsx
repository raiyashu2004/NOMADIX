import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'

// Fix default leaflet icon issue with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

type ItineraryMapProps = {
  items: Array<{ id: string; title: string; location: string; lat?: number; lng?: number }>
  onLocationSelect?: (lat: number, lng: number) => void
  selectingMode?: boolean
}

function LocationSelector({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function ItineraryMap({ items, onLocationSelect, selectingMode }: ItineraryMapProps) {
  const validItems = items.filter(item => item.lat !== undefined && item.lng !== undefined)
  
  // Default center (Paris) or first valid item
  const center: [number, number] = validItems.length > 0 
    ? [validItems[0].lat!, validItems[0].lng!] 
    : [48.8566, 2.3522]

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-border relative z-0">
      <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {validItems.map(item => (
          <Marker key={item.id} position={[item.lat!, item.lng!]}>
            <Popup>
              <strong>{item.title}</strong><br />
              {item.location}
            </Popup>
          </Marker>
        ))}

        {selectingMode && onLocationSelect && (
          <LocationSelector onSelect={onLocationSelect} />
        )}
      </MapContainer>
      
      {selectingMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-white px-4 py-2 rounded-full text-sm font-medium shadow-md pointer-events-none">
          Click anywhere on the map to drop a pin
        </div>
      )}
    </div>
  )
}
