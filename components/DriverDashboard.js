'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Car, MapPin, DollarSign, Clock, Navigation, CheckCircle, XCircle, Star } from 'lucide-react'
import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false })

export default function DriverDashboard({ user }) {
  const [isOnline, setIsOnline] = useState(false)
  const [currentRide, setCurrentRide] = useState(null)
  const [pendingRides, setPendingRides] = useState([])
  const [earnings, setEarnings] = useState({ today: 0, total: 0 })
  const [loading, setLoading] = useState(false)
  const [driverLocation, setDriverLocation] = useState(null)

  // Get driver's current location
  useEffect(() => {
    if (isOnline && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setDriverLocation(loc)

          // Broadcast location if on a ride
          if (currentRide) {
            supabase.channel(`ride-${currentRide.id}`).send({
              type: 'broadcast',
              event: 'driver_location',
              payload: loc
            })
          }
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true }
      )

      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [isOnline, currentRide])

  // Fetch pending rides when online
  useEffect(() => {
    if (!isOnline) {
      setPendingRides([])
      return
    }

    const fetchRides = async () => {
      try {
        const response = await fetch('/api/rides?status=requested')
        if (response.ok) {
          const rides = await response.json()
          setPendingRides(rides)
        }
      } catch (error) {
        console.error('Error fetching rides:', error)
      }
    }

    fetchRides()
    const interval = setInterval(fetchRides, 5000)

    return () => clearInterval(interval)
  }, [isOnline])

  // Fetch driver earnings
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const response = await fetch(`/api/drivers/${user.id}/earnings`)
        if (response.ok) {
          const data = await response.json()
          setEarnings(data)
        }
      } catch (error) {
        console.error('Error fetching earnings:', error)
      }
    }

    fetchEarnings()
  }, [user.id])

  const handleAcceptRide = async (ride) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/rides/${ride.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'accepted',
          driver_id: user.id,
          driver: {
            id: user.id,
            name: user.user_metadata?.name || 'Driver',
            vehicle: 'Toyota Camry',
            rating: 4.8
          }
        })
      })

      if (!response.ok) throw new Error('Failed to accept ride')

      const updatedRide = await response.json()
      setCurrentRide(updatedRide)
      setPendingRides(prev => prev.filter(r => r.id !== ride.id))
      toast.success('Ride accepted!')

      // Notify rider
      supabase.channel(`ride-${ride.id}`).send({
        type: 'broadcast',
        event: 'ride_update',
        payload: updatedRide
      })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateRideStatus = async (status) => {
    if (!currentRide) return

    setLoading(true)
    try {
      const response = await fetch(`/api/rides/${currentRide.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!response.ok) throw new Error('Failed to update ride')

      const updatedRide = await response.json()

      // Notify rider
      supabase.channel(`ride-${currentRide.id}`).send({
        type: 'broadcast',
        event: 'ride_update',
        payload: updatedRide
      })

      if (status === 'completed') {
        toast.success('Ride completed! Great job!')
        setCurrentRide(null)
        setEarnings(prev => ({
          ...prev,
          today: prev.today + updatedRide.estimated_fare,
          total: prev.total + updatedRide.estimated_fare
        }))
      } else {
        setCurrentRide(updatedRide)
        toast.success(`Status updated to ${status}`)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Earnings</p>
                <p className="text-2xl font-bold">${earnings.today.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold">${earnings.total.toFixed(2)}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <Switch
                    checked={isOnline}
                    onCheckedChange={setIsOnline}
                  />
                  <span className={`font-medium ${isOnline ? 'text-green-500' : 'text-gray-500'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <Car className={`h-8 w-8 ${isOnline ? 'text-green-500' : 'text-gray-400'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Ride */}
      {currentRide && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Current Ride
              <Badge>{currentRide.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[300px] rounded-xl overflow-hidden border">
              <MapComponent
                pickupLocation={currentRide.pickup_location}
                dropoffLocation={currentRide.dropoff_location}
                driverLocation={driverLocation}
                onPickupChange={() => {}}
                onDropoffChange={() => {}}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="font-medium text-sm">{currentRide.pickup_address}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Dropoff</p>
                <p className="font-medium text-sm">{currentRide.dropoff_address}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Fare</p>
                <p className="text-xl font-bold">${currentRide.estimated_fare?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Car Type</p>
                <p className="font-medium capitalize">{currentRide.car_type}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {currentRide.status === 'accepted' && (
                <Button
                  className="flex-1"
                  onClick={() => updateRideStatus('arrived')}
                  disabled={loading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Arrived at Pickup
                </Button>
              )}
              {currentRide.status === 'arrived' && (
                <Button
                  className="flex-1"
                  onClick={() => updateRideStatus('in_progress')}
                  disabled={loading}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Start Trip
                </Button>
              )}
              {currentRide.status === 'in_progress' && (
                <Button
                  className="flex-1"
                  onClick={() => updateRideStatus('completed')}
                  disabled={loading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Ride
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Ride Requests */}
      {isOnline && !currentRide && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Available Rides
              {pendingRides.length > 0 && (
                <Badge variant="secondary">{pendingRides.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRides.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No ride requests available</p>
                <p className="text-sm">Stay online to receive requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="p-4 border rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-sm">{ride.pickup_address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          <span className="text-sm">{ride.dropoff_address}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${ride.estimated_fare?.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{ride.estimated_time} min</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleAcceptRide(ride)}
                        disabled={loading}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <XCircle className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Offline Message */}
      {!isOnline && (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">You're Offline</h3>
            <p className="text-muted-foreground mb-4">
              Go online to start accepting ride requests
            </p>
            <Button onClick={() => setIsOnline(true)}>
              Go Online
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
