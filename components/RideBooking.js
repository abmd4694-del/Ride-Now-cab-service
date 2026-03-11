'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { MapPin, Navigation, Car, DollarSign, Clock, X } from 'lucide-react'
import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false })

const CAR_TYPES = [
  { id: 'economy', name: 'Economy', multiplier: 1, icon: '🚗', description: 'Affordable rides' },
  { id: 'comfort', name: 'Comfort', multiplier: 1.5, icon: '🚙', description: 'More space & comfort' },
  { id: 'premium', name: 'Premium', multiplier: 2, icon: '🚘', description: 'Luxury experience' }
]

const BASE_FARE = 2.50
const PER_KM_RATE = 1.20

export default function RideBooking({ user, onBookRide }) {
  const [pickupLocation, setPickupLocation] = useState(null)
  const [dropoffLocation, setDropoffLocation] = useState(null)
  const [pickupAddress, setPickupAddress] = useState('')
  const [dropoffAddress, setDropoffAddress] = useState('')
  const [selectedCarType, setSelectedCarType] = useState('economy')
  const [estimatedFare, setEstimatedFare] = useState(null)
  const [estimatedTime, setEstimatedTime] = useState(null)
  const [loading, setLoading] = useState(false)

  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Calculate fare when locations change
  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      const distance = calculateDistance(
        pickupLocation.lat, pickupLocation.lng,
        dropoffLocation.lat, dropoffLocation.lng
      )
      const carType = CAR_TYPES.find(c => c.id === selectedCarType)
      const fare = (BASE_FARE + (distance * PER_KM_RATE)) * carType.multiplier
      const time = Math.ceil(distance * 2.5) // ~2.5 min per km

      setEstimatedFare(fare.toFixed(2))
      setEstimatedTime(time)
    }
  }, [pickupLocation, dropoffLocation, selectedCarType])

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPickupLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setPickupAddress('Current Location')
          toast.success('Pickup location set to current location')
        },
        (error) => {
          toast.error('Unable to get your location')
        }
      )
    }
  }

  const clearLocations = () => {
    setPickupLocation(null)
    setDropoffLocation(null)
    setPickupAddress('')
    setDropoffAddress('')
    setEstimatedFare(null)
    setEstimatedTime(null)
  }

  const handleBookRide = async () => {
    if (!pickupLocation || !dropoffLocation) {
      toast.error('Please select pickup and dropoff locations')
      return
    }

    setLoading(true)

    try {
      const rideData = {
        rider_id: user.id,
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        pickup_address: pickupAddress || 'Selected on map',
        dropoff_address: dropoffAddress || 'Selected on map',
        car_type: selectedCarType,
        estimated_fare: parseFloat(estimatedFare),
        estimated_time: estimatedTime,
        status: 'requested'
      }

      const response = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rideData)
      })

      if (!response.ok) throw new Error('Failed to book ride')

      const ride = await response.json()
      toast.success('Ride requested! Looking for drivers...')
      onBookRide(ride)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Map Section */}
      <Card className="lg:row-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Select Locations
            </span>
            {(pickupLocation || dropoffLocation) && (
              <Button variant="ghost" size="sm" onClick={clearLocations}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on the map to set {!pickupLocation ? 'pickup' : !dropoffLocation ? 'dropoff' : 'locations'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] rounded-xl overflow-hidden border">
            <MapComponent
              pickupLocation={pickupLocation}
              dropoffLocation={dropoffLocation}
              onPickupChange={(loc) => {
                setPickupLocation(loc)
                setPickupAddress(`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`)
              }}
              onDropoffChange={(loc) => {
                setDropoffLocation(loc)
                setDropoffAddress(`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`)
              }}
            />
          </div>
          <Button
            variant="outline"
            className="w-full mt-3"
            onClick={getCurrentLocation}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Use Current Location as Pickup
          </Button>
        </CardContent>
      </Card>

      {/* Booking Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Choose Your Ride
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Display */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="font-medium text-sm truncate">
                  {pickupAddress || 'Click on map to select'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Dropoff</p>
                <p className="font-medium text-sm truncate">
                  {dropoffAddress || 'Click on map to select'}
                </p>
              </div>
            </div>
          </div>

          {/* Car Type Selection */}
          <div className="space-y-2">
            <Label>Select Vehicle Type</Label>
            <RadioGroup
              value={selectedCarType}
              onValueChange={setSelectedCarType}
              className="grid grid-cols-3 gap-2"
            >
              {CAR_TYPES.map((car) => (
                <div key={car.id}>
                  <RadioGroupItem
                    value={car.id}
                    id={car.id}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={car.id}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                  >
                    <span className="text-2xl mb-1">{car.icon}</span>
                    <span className="font-medium text-sm">{car.name}</span>
                    <span className="text-xs text-muted-foreground">{car.multiplier}x</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Fare Estimate & Book Button */}
      <Card>
        <CardContent className="pt-6">
          {estimatedFare && estimatedTime ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">Estimated Fare</span>
                </div>
                <span className="text-2xl font-bold">${estimatedFare}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Estimated Time</span>
                </div>
                <span className="text-lg font-semibold">{estimatedTime} min</span>
              </div>
              <Button
                className="w-full h-12 text-lg"
                onClick={handleBookRide}
                disabled={loading}
              >
                {loading ? 'Requesting Ride...' : 'Request Ride'}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Select pickup and dropoff locations to see fare estimate</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
