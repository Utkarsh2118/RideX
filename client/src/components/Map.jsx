import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const defaultCenter = [20.5937, 78.9629]

const markerIcon = (className) =>
  L.divIcon({
    className: 'ridex-marker-wrapper',
    html: `<span class="ridex-marker ${className}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

const pickupIcon = markerIcon('ridex-marker-pickup')
const destinationIcon = markerIcon('ridex-marker-destination')
const locationIcon = markerIcon('ridex-marker-current')

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (event) => onMapClick([event.latlng.lat, event.latlng.lng]),
  })

  return null
}

function MapViewport({ center, pickup, destination }) {
  const map = useMap()

  useEffect(() => {
    const points = [pickup, destination].filter(Boolean)

    if (points.length > 1) {
      map.fitBounds(points, { padding: [36, 36] })
    } else if (center) {
      map.setView(center, 13)
    }
  }, [center, destination, map, pickup])

  return null
}

function Map({ pickup, destination, onMapClick, onCurrentLocation }) {
  const [center, setCenter] = useState(pickup || defaultCenter)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [route, setRoute] = useState(null)
  const [routeError, setRouteError] = useState('')
  const [isRouteLoading, setIsRouteLoading] = useState(false)

  useEffect(() => {
    if (!pickup || !destination) {
      return undefined
    }

    const controller = new AbortController()
    const coordinates = `${pickup[1]},${pickup[0]};${destination[1]},${destination[0]}`

    queueMicrotask(() => {
      if (controller.signal.aborted) return

      setIsRouteLoading(true)
      setRouteError('')

      fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error('Route service unavailable')
          return response.json()
        })
        .then((data) => {
          const geometry = data.routes?.[0]?.geometry?.coordinates
          if (!geometry) throw new Error('No route found')
          setRoute(geometry.map(([longitude, latitude]) => [latitude, longitude]))
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            setRoute(null)
            setRouteError('Route preview is unavailable. Your locations are still selected.')
          }
        })
        .finally(() => setIsRouteLoading(false))
    })

    return () => controller.abort()
  }, [destination, pickup])

  const mapCenter = useMemo(() => pickup || center, [center, pickup])

  const findCurrentLocation = () => {
    if (!navigator.geolocation) {
      onCurrentLocation?.(null, 'Location is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = [coords.latitude, coords.longitude]
        setCenter(location)
        setCurrentLocation(location)
        onCurrentLocation?.(location)
      },
      () => onCurrentLocation?.(null, 'Location permission was denied. You can select a point on the map.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="map-frame">
      <div className="map-actions">
        <button type="button" className="map-location-button" onClick={findCurrentLocation}>
          Use my location
        </button>
        {isRouteLoading && <span className="map-status">Building route...</span>}
        {routeError && <span className="map-error">{routeError}</span>}
      </div>
      <MapContainer center={mapCenter} zoom={5} scrollWheelZoom className="ridex-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onMapClick} />
        <MapViewport center={mapCenter} pickup={pickup} destination={destination} />
        {pickup && <Marker position={pickup} icon={pickupIcon}><Popup>Pickup location</Popup></Marker>}
        {destination && <Marker position={destination} icon={destinationIcon}><Popup>Destination</Popup></Marker>}
        {currentLocation && <Marker position={currentLocation} icon={locationIcon}><Popup>Your current location</Popup></Marker>}
        {route && pickup && destination && <Polyline positions={route} pathOptions={{ color: '#ef6c45', weight: 5 }} />}
      </MapContainer>
    </div>
  )
}

export default Map
