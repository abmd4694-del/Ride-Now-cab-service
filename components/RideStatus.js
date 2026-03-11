'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Phone, MessageSquare, X, Star, DollarSign, Navigation, Car, CheckCircle, Shield, Copy } from 'lucide-react'
import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false })

const STATUS_STEPS = [
  { status: 'requested', label: 'Finding Driver', progress: 20 },
  { status: 'accepted', label: 'Driver Assigned', progress: 40 },
  { status: 'arrived', label: 'Driver Arrived', progress: 60 },
  { status: 'in_progress', label: 'On the Way', progress: 80 },
  { status: 'completed', label: 'Arrived', progress: 100 }
]

export default function RideStatus({ ride, user, onRideUpdate, onCancelRide }) {
  const [currentRide, setCurrentRide] = useState(ride)
  const [driverLocation, setDriverLocation] = useState(null)
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(5)
  const [loading, setLoading] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`ride-${ride.id}`)
      .on('broadcast', { event: 'ride_update' }, (payload) => {
        setCurrentRide(payload.payload)
        if (payload.payload.status === 'completed') {
          setShowRating(true)
        }
      })
      .on('broadcast', { event: 'driver_location' }, (payload) => {
        setDriverLocation(payload.payload)
      })
      .subscribe()

    // Poll for updates as backup
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/rides/${ride.id}`)
        if (response.ok) {
          const updatedRide = await response.json()
          setCurrentRide(updatedRide)
          if (updatedRide.status === 'completed') {
            setShowRating(true)
          }
        }
      } catch (error) {
        console.error('Error polling ride status:', error)
      }
    }, 5000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [ride.id])

  const currentStep = STATUS_STEPS.find(s => s.status === currentRide.status) || STATUS_STEPS[0]

  const copyVerificationCode = () => {
    if (currentRide.verification_code) {
      navigator.clipboard.writeText(currentRide.verification_code)
      setCodeCopied(true)
      toast.success('Code copied to clipboard!')
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  const handleCancelRide = async () => {
    if (currentRide.status !== 'requested') {
      toast.error('Cannot cancel ride after driver is assigned')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/rides/${ride.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      })

      if (!response.ok) throw new Error('Failed to cancel ride')

      toast.success('Ride cancelled')
      onCancelRide()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRating = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/rides/${ride.id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, rider_id: user.id })
      })

      if (!response.ok) throw new Error('Failed to submit rating')

      toast.success('Thank you for your feedback!')
      onRideUpdate({ ...currentRide, rated: true })
      onCancelRide() // Go back to booking
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ride_id: ride.id,
          amount: currentRide.estimated_fare,
          origin_url: window.location.origin
        })
      })

      if (!response.ok) throw new Error('Failed to create payment')

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (showRating) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle>Ride Completed!</CardTitle>
          <p className="text-muted-foreground">How was your trip?</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
              </button>
            ))}
          </div>

          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Total Fare</p>
            <p className="text-3xl font-bold">${currentRide.estimated_fare?.toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            <Button className="w-full" onClick={handlePayment} disabled={loading}>
              <DollarSign className="h-4 w-4 mr-2" />
              Pay Now
            </Button>
            <Button variant="outline" className="w-full" onClick={handleRating} disabled={loading}>
              Submit Rating
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Map with driver tracking */}
      <Card className="lg:row-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Live Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] rounded-xl overflow-hidden border">
            <MapComponent
              pickupLocation={currentRide.pickup_location}
              dropoffLocation={currentRide.dropoff_location}
              driverLocation={driverLocation}
              onPickupChange={() => {}}
              onDropoffChange={() => {}}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ride Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ride Status</CardTitle>
            <Badge variant={currentRide.status === 'cancelled' ? 'destructive' : 'default'}>
              {currentStep.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={currentStep.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              {STATUS_STEPS.slice(0, 4).map((step) => (
                <span
                  key={step.status}
                  className={currentStep.progress >= step.progress ? 'text-primary font-medium' : ''}
                >
                  {step.label}
                </span>
              ))}
            </div>
          </div>

          {/* Driver Info (if assigned) */}
          {currentRide.driver && (
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                🚗
              </div>
              <div className="flex-1">
                <p className="font-semibold">{currentRide.driver.name}</p>
                <p className="text-sm text-muted-foreground">{currentRide.driver.vehicle}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">{currentRide.driver.rating || '4.8'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Verification Code - Show when driver is assigned */}
          {currentRide.verification_code && (currentRide.status === 'accepted' || currentRide.status === 'arrived') && (
            <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Ride Verification Code</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {currentRide.verification_code.split('').map((digit, i) => (
                    <div
                      key={i}
                      className="w-12 h-14 bg-white/20 rounded-lg flex items-center justify-center text-2xl font-bold"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={copyVerificationCode}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {codeCopied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-white/80 mt-2">
                Share this code with your driver to start the trip
              </p>
            </div>
          )}

          {/* Code Verified Badge */}
          {currentRide.code_verified && currentRide.status === 'in_progress' && (
            <div className="flex items-center gap-2 p-3 bg-green-100 text-green-800 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Code verified - Trip in progress</span>
            </div>
          )}

          {/* Ride Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <div>
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="font-medium text-sm">{currentRide.pickup_address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <div>
                <p className="text-xs text-muted-foreground">Dropoff</p>
                <p className="font-medium text-sm">{currentRide.dropoff_address}</p>
              </div>
            </div>
          </div>

          {/* Fare & Actions */}
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Fare</p>
              <p className="text-2xl font-bold">${currentRide.estimated_fare?.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">ETA</p>
              <p className="text-lg font-semibold">{currentRide.estimated_time} min</p>
            </div>
          </div>

          {currentRide.status === 'requested' && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleCancelRide}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Ride
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
