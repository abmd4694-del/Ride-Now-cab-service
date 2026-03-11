'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { MapPin, Navigation, Car, DollarSign, Clock, X, Search, Loader2, Building2, Coffee, Hotel, ShoppingBag, Fuel, Hospital } from 'lucide-react'
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
  const [pickupQuery, setPickupQuery] = useState('')
  const [dropoffQuery, setDropoffQuery] = useState('')
  const [pickupSuggestions, setPickupSuggestions] = useState([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState([])
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false)
  const [searchingPickup, setSearchingPickup] = useState(false)
  const [searchingDropoff, setSearchingDropoff] = useState(false)
  const [selectedCarType, setSelectedCarType] = useState('economy')
  const [estimatedFare, setEstimatedFare] = useState(null)
  const [estimatedTime, setEstimatedTime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState(false)
  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const pickupRef = useRef(null)
  const dropoffRef = useRef(null)

  // Place type icons
  const getPlaceIcon = (type) => {
    const icons = {
      restaurant: <Coffee className="h-4 w-4" />,
      cafe: <Coffee className="h-4 w-4" />,
      hotel: <Hotel className="h-4 w-4" />,
      hospital: <Hospital className="h-4 w-4" />,
      fuel: <Fuel className="h-4 w-4" />,
      mall: <ShoppingBag className="h-4 w-4" />,
      supermarket: <ShoppingBag className="h-4 w-4" />,
      attraction: <Building2 className="h-4 w-4" />,
      museum: <Building2 className="h-4 w-4" />,
      default: <MapPin className="h-4 w-4" />
    }
    return icons[type] || icons.default
  }

  // Fetch nearby places when pickup location changes
  useEffect(() => {
    if (pickupLocation) {
      fetchNearbyPlaces(pickupLocation.lat, pickupLocation.lng)
    } else {
      setNearbyPlaces([])
    }
  }, [pickupLocation])

  const fetchNearbyPlaces = async (lat, lng) => {
    setLoadingPlaces(true)
    try {
      const response = await fetch(`/api/places/nearby?lat=${lat}&lng=${lng}`)
      if (response.ok) {
        const data = await response.json()
        setNearbyPlaces(data.places || [])
      }
    } catch (error) {
      console.error('Error fetching nearby places:', error)
    } finally {
      setLoadingPlaces(false)
    }
  }

  const selectNearbyPlace = (place) => {
    setDropoffLocation({ lat: place.lat, lng: place.lng })
    setDropoffAddress(place.name)
    setDropoffQuery(place.name)
    toast.success(`Selected ${place.name} as dropoff`)
  }

  // Geocoding function using Nominatim (OpenStreetMap)
  const searchAddress = async (query, type) => {
    if (!query || query.length < 3) {
      if (type === 'pickup') setPickupSuggestions([])
      else setDropoffSuggestions([])
      return
    }

    if (type === 'pickup') setSearchingPickup(true)
    else setSearchingDropoff(true)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'RideNow App'
          }
        }
      )
      const data = await response.json()
      
      const suggestions = data.map(item => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        short_name: item.address ? 
          `${item.address.road || item.address.neighbourhood || ''}, ${item.address.city || item.address.town || item.address.village || ''}`.replace(/^, /, '') :
          item.display_name.split(',').slice(0, 2).join(',')
      }))

      if (type === 'pickup') setPickupSuggestions(suggestions)
      else setDropoffSuggestions(suggestions)
    } catch (error) {
      console.error('Geocoding error:', error)
      toast.error('Failed to search address')
    } finally {
      if (type === 'pickup') setSearchingPickup(false)
      else setSearchingDropoff(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pickupQuery && showPickupSuggestions) {
        searchAddress(pickupQuery, 'pickup')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [pickupQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (dropoffQuery && showDropoffSuggestions) {
        searchAddress(dropoffQuery, 'dropoff')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [dropoffQuery])

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickupRef.current && !pickupRef.current.contains(event.target)) {
        setShowPickupSuggestions(false)
      }
      if (dropoffRef.current && !dropoffRef.current.contains(event.target)) {
        setShowDropoffSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectPickupSuggestion = (suggestion) => {
    setPickupLocation({ lat: suggestion.lat, lng: suggestion.lng })
    setPickupAddress(suggestion.short_name)
    setPickupQuery(suggestion.short_name)
    setShowPickupSuggestions(false)
    setPickupSuggestions([])
  }

  const selectDropoffSuggestion = (suggestion) => {
    setDropoffLocation({ lat: suggestion.lat, lng: suggestion.lng })
    setDropoffAddress(suggestion.short_name)
    setDropoffQuery(suggestion.short_name)
    setShowDropoffSuggestions(false)
    setDropoffSuggestions([])
  }

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
      let fare = (BASE_FARE + (distance * PER_KM_RATE)) * carType.multiplier
      const time = Math.ceil(distance * 2.5) // ~2.5 min per km

      if (discountApplied) {
        fare = fare * 0.8
      }

      setEstimatedFare(fare.toFixed(2))
      setEstimatedTime(time)
    }
  }, [pickupLocation, dropoffLocation, selectedCarType, discountApplied])

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'MAR2026') {
      setDiscountApplied(true)
      toast.success('Promo code applied! 20% discount added.')
    } else {
      toast.error('Invalid promo code.')
    }
  }

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setPickupLocation(loc)
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`,
              { headers: { 'User-Agent': 'RideNow App' } }
            )
            const data = await response.json()
            const address = data.address ? 
              `${data.address.road || ''}, ${data.address.city || data.address.town || ''}`.replace(/^, /, '') :
              'Current Location'
            setPickupAddress(address)
            setPickupQuery(address)
          } catch {
            setPickupAddress('Current Location')
            setPickupQuery('Current Location')
          }
          
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
    setPickupQuery('')
    setDropoffQuery('')
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
            Type an address or click on the map
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pickup Input */}
          <div className="relative" ref={pickupRef}>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              Pickup Location
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter pickup address..."
                className="pl-10 pr-10"
                value={pickupQuery}
                onChange={(e) => {
                  setPickupQuery(e.target.value)
                  setShowPickupSuggestions(true)
                }}
                onFocus={() => setShowPickupSuggestions(true)}
              />
              {searchingPickup && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {showPickupSuggestions && pickupSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {pickupSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 flex items-start gap-3"
                    onClick={() => selectPickupSuggestion(suggestion)}
                  >
                    <MapPin className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{suggestion.short_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{suggestion.display_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dropoff Input */}
          <div className="relative" ref={dropoffRef}>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              Dropoff Location
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter dropoff address..."
                className="pl-10 pr-10"
                value={dropoffQuery}
                onChange={(e) => {
                  setDropoffQuery(e.target.value)
                  setShowDropoffSuggestions(true)
                }}
                onFocus={() => setShowDropoffSuggestions(true)}
              />
              {searchingDropoff && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {dropoffSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 flex items-start gap-3"
                    onClick={() => selectDropoffSuggestion(suggestion)}
                  >
                    <MapPin className="h-4 w-4 mt-0.5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{suggestion.short_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{suggestion.display_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="h-[300px] rounded-xl overflow-hidden border">
            <MapComponent
              pickupLocation={pickupLocation}
              dropoffLocation={dropoffLocation}
              onPickupChange={(loc) => {
                setPickupLocation(loc)
                setPickupAddress(`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`)
                setPickupQuery(`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`)
              }}
              onDropoffChange={(loc) => {
                setDropoffLocation(loc)
                setDropoffAddress(`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`)
                setDropoffQuery(`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`)
              }}
            />
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={getCurrentLocation}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Use Current Location as Pickup
          </Button>

          {/* Nearby Places */}
          {pickupLocation && (
            <div className="mt-4">
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-primary" />
                Nearby Places (Quick Select Dropoff)
              </Label>
              {loadingPlaces ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Finding nearby places...</span>
                </div>
              ) : nearbyPlaces.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-auto">
                  {nearbyPlaces.map((place, index) => (
                    <button
                      key={index}
                      onClick={() => selectNearbyPlace(place)}
                      className="flex items-center gap-2 p-2 text-left rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                        {getPlaceIcon(place.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{place.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{place.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No nearby places found
                </p>
              )}
            </div>
          )}
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
          {/* Location Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="font-medium text-sm truncate">
                  {pickupAddress || 'Enter pickup address above'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Dropoff</p>
                <p className="font-medium text-sm truncate">
                  {dropoffAddress || 'Enter dropoff address above'}
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
                <div className="flex items-center gap-2">
                  {discountApplied && <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">20% OFF</Badge>}
                  <span className="text-2xl font-bold">${estimatedFare}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  placeholder="Promo Code (e.g. MAR2026)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  disabled={discountApplied}
                />
                <Button variant="outline" onClick={handleApplyPromo} disabled={discountApplied || !promoCode}>
                  Apply
                </Button>
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
              <p>Enter pickup and dropoff locations to see fare estimate</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
