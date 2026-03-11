'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'

const MapComponent = ({ pickupLocation, dropoffLocation, onPickupChange, onDropoffChange, driverLocation }) => {
  const [map, setMap] = useState(null)
  const [pickupMarker, setPickupMarker] = useState(null)
  const [dropoffMarker, setDropoffMarker] = useState(null)
  const [driverMarker, setDriverMarker] = useState(null)
  const [routeLayer, setRouteLayer] = useState(null)
  const mapRef = useRef(null)
  const [L, setL] = useState(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        setL(leaflet.default)
      })
    }
  }, [])

  useEffect(() => {
    if (!L || map) return

    const newMap = L.map(mapRef.current).setView([40.7128, -74.006], 13)
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(newMap)

    // Click handler for setting locations
    newMap.on('click', (e) => {
      const { lat, lng } = e.latlng
      if (!pickupLocation) {
        onPickupChange({ lat, lng })
      } else if (!dropoffLocation) {
        onDropoffChange({ lat, lng })
      }
    })

    setMap(newMap)

    return () => {
      newMap.remove()
    }
  }, [L])

  // Update pickup marker
  useEffect(() => {
    if (!L || !map) return

    if (pickupMarker) {
      map.removeLayer(pickupMarker)
    }

    if (pickupLocation) {
      const greenIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
      const marker = L.marker([pickupLocation.lat, pickupLocation.lng], { icon: greenIcon }).addTo(map)
      marker.bindPopup('Pickup Location')
      setPickupMarker(marker)
    }
  }, [pickupLocation, L, map])

  // Update dropoff marker
  useEffect(() => {
    if (!L || !map) return

    if (dropoffMarker) {
      map.removeLayer(dropoffMarker)
    }

    if (dropoffLocation) {
      const redIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
      const marker = L.marker([dropoffLocation.lat, dropoffLocation.lng], { icon: redIcon }).addTo(map)
      marker.bindPopup('Dropoff Location')
      setDropoffMarker(marker)
    }
  }, [dropoffLocation, L, map])

  // Update driver marker
  useEffect(() => {
    if (!L || !map) return

    if (driverMarker) {
      map.removeLayer(driverMarker)
    }

    if (driverLocation) {
      const carIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: #3b82f6; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px;">🚗</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
      const marker = L.marker([driverLocation.lat, driverLocation.lng], { icon: carIcon }).addTo(map)
      marker.bindPopup('Driver Location')
      setDriverMarker(marker)
    }
  }, [driverLocation, L, map])

  // Draw route between pickup and dropoff
  useEffect(() => {
    if (!L || !map) return

    if (routeLayer) {
      map.removeLayer(routeLayer)
    }

    if (pickupLocation && dropoffLocation) {
      const route = L.polyline(
        [[pickupLocation.lat, pickupLocation.lng], [dropoffLocation.lat, dropoffLocation.lng]],
        { color: '#3b82f6', weight: 4, opacity: 0.7, dashArray: '10, 10' }
      ).addTo(map)
      setRouteLayer(route)

      // Fit bounds to show both markers
      const bounds = L.latLngBounds(
        [pickupLocation.lat, pickupLocation.lng],
        [dropoffLocation.lat, dropoffLocation.lng]
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [pickupLocation, dropoffLocation, L, map])

  return (
    <div ref={mapRef} className="w-full h-full rounded-xl" style={{ minHeight: '400px' }} />
  )
}

export default MapComponent
