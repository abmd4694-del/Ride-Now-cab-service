'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { History, MapPin, DollarSign, Clock, Star, Download, ChevronRight } from 'lucide-react'

export default function RideHistory({ user }) {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const response = await fetch(`/api/rides?user_id=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          setRides(data.filter(r => r.status === 'completed' || r.status === 'cancelled'))
        }
      } catch (error) {
        console.error('Error fetching rides:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRides()
  }, [user.id])

  const downloadReceipt = (ride) => {
    const receipt = `
========================================
           RIDENOW RECEIPT
========================================

Ride ID: ${ride.id}
Date: ${new Date(ride.created_at).toLocaleString()}

Pickup: ${ride.pickup_address}
Dropoff: ${ride.dropoff_address}

Vehicle Type: ${ride.car_type?.toUpperCase()}
Estimated Time: ${ride.estimated_time} minutes

----------------------------------------
TOTAL FARE: $${ride.estimated_fare?.toFixed(2)}
----------------------------------------

Thank you for riding with RideNow!
========================================
    `

    const blob = new Blob([receipt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ridenow-receipt-${ride.id.slice(0, 8)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Receipt downloaded!')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading ride history...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Ride History
          {rides.length > 0 && (
            <Badge variant="secondary">{rides.length} rides</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rides.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No completed rides yet</p>
            <p className="text-sm">Your ride history will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <div
                key={ride.id}
                className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(ride.created_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <Badge className={getStatusColor(ride.status)}>
                      {ride.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">${ride.estimated_fare?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{ride.car_type}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm truncate">{ride.pickup_address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-sm truncate">{ride.dropoff_address}</span>
                  </div>
                </div>

                {ride.driver && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <span>Driver: {ride.driver.name}</span>
                    {ride.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{ride.rating}</span>
                      </div>
                    )}
                  </div>
                )}

                {ride.status === 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => downloadReceipt(ride)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Receipt
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
