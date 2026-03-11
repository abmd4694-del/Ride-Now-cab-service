'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Car, User, LogOut, History, MapPin, Menu, X } from 'lucide-react'
import AuthModal from '@/components/AuthModal'
import RideBooking from '@/components/RideBooking'
import RideStatus from '@/components/RideStatus'
import DriverDashboard from '@/components/DriverDashboard'
import RideHistory from '@/components/RideHistory'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1570539946040-2a806ae6745b'

export default function App() {
  const [user, setUser] = useState(null)
  const [userType, setUserType] = useState('rider')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [currentView, setCurrentView] = useState('booking') // booking, status, history
  const [currentRide, setCurrentRide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          // Fetch user type from database
          const response = await fetch(`/api/users/${session.user.id}`)
          if (response.ok) {
            const userData = await response.json()
            setUserType(userData.user_type || 'rider')
          }
          // Check for active ride
          const rideResponse = await fetch(`/api/rides/active?user_id=${session.user.id}`)
          if (rideResponse.ok) {
            const activeRide = await rideResponse.json()
            if (activeRide && activeRide.id) {
              setCurrentRide(activeRide)
              setCurrentView('status')
            }
          }
        }
      } catch (error) {
        console.error('Session check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setCurrentRide(null)
        setCurrentView('booking')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check for payment success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')
    
    if (sessionId) {
      // Poll for payment status
      const checkPayment = async () => {
        try {
          const response = await fetch(`/api/payments/status/${sessionId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.payment_status === 'paid') {
              toast.success('Payment successful!')
              // Clear URL params
              window.history.replaceState({}, '', window.location.pathname)
            }
          }
        } catch (error) {
          console.error('Payment check error:', error)
        }
      }
      checkPayment()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserType('rider')
    setCurrentRide(null)
    setCurrentView('booking')
    toast.success('Signed out successfully')
  }

  const handleAuthSuccess = (authUser, type) => {
    setUser(authUser)
    setUserType(type)
  }

  const handleBookRide = (ride) => {
    setCurrentRide(ride)
    setCurrentView('status')
  }

  const handleRideComplete = () => {
    setCurrentRide(null)
    setCurrentView('booking')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Car className="h-12 w-12 animate-bounce mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading RideNow...</p>
        </div>
      </div>
    )
  }

  // Landing page for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative h-screen">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
          </div>

          {/* Navigation */}
          <nav className="relative z-10 flex items-center justify-between p-6">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-white" />
              <span className="text-2xl font-bold text-white">RideNow</span>
            </div>
            <Button
              onClick={() => setShowAuthModal(true)}
              className="bg-white text-black hover:bg-gray-100"
            >
              Sign In
            </Button>
          </nav>

          {/* Hero Content */}
          <div className="relative z-10 flex flex-col justify-center px-6 md:px-12 lg:px-24 max-w-2xl pt-24 pb-64">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Your Ride,<br />Your Way
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8">
              Book rides instantly with RideNow. Safe, reliable, and affordable 
              transportation at your fingertips.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => setShowAuthModal(true)}
                className="bg-primary hover:bg-primary/90 text-lg px-8"
              >
                <MapPin className="h-5 w-5 mr-2" />
                Book a Ride
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowAuthModal(true)}
                className="bg-transparent border-white text-white hover:bg-white/10 text-lg px-8"
              >
                <Car className="h-5 w-5 mr-2" />
                Drive with Us
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/80 to-transparent pt-16 pb-6 px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                <MapPin className="h-6 w-6 mb-2 text-primary" />
                <h3 className="font-semibold text-gray-900 mb-1">Real-time Tracking</h3>
                <p className="text-gray-600 text-sm">Track your ride in real-time on the map</p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                <Car className="h-6 w-6 mb-2 text-primary" />
                <h3 className="font-semibold text-gray-900 mb-1">Multiple Vehicle Types</h3>
                <p className="text-gray-600 text-sm">Choose from Economy, Comfort, or Premium</p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                <User className="h-6 w-6 mb-2 text-primary" />
                <h3 className="font-semibold text-gray-900 mb-1">Verified Drivers</h3>
                <p className="text-gray-600 text-sm">All drivers are background checked</p>
              </div>
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    )
  }

  // Main App for authenticated users
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Car className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold">RideNow</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {userType === 'rider' && (
                <>
                  <Button
                    variant={currentView === 'booking' ? 'secondary' : 'ghost'}
                    onClick={() => { setCurrentView('booking'); setCurrentRide(null); }}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Book Ride
                  </Button>
                  <Button
                    variant={currentView === 'history' ? 'secondary' : 'ghost'}
                    onClick={() => setCurrentView('history')}
                  >
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                </>
              )}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs capitalize">
                  {userType}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
              
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col gap-2">
                {userType === 'rider' && (
                  <>
                    <Button
                      variant={currentView === 'booking' ? 'secondary' : 'ghost'}
                      className="justify-start"
                      onClick={() => {
                        setCurrentView('booking')
                        setCurrentRide(null)
                        setMobileMenuOpen(false)
                      }}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Book Ride
                    </Button>
                    <Button
                      variant={currentView === 'history' ? 'secondary' : 'ghost'}
                      className="justify-start"
                      onClick={() => {
                        setCurrentView('history')
                        setMobileMenuOpen(false)
                      }}
                    >
                      <History className="h-4 w-4 mr-2" />
                      History
                    </Button>
                  </>
                )}
                <div className="flex items-center gap-2 text-sm p-2">
                  <User className="h-4 w-4" />
                  <span>{user.email}</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs capitalize">
                    {userType}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {userType === 'driver' ? (
          <DriverDashboard user={user} />
        ) : (
          <>
            {currentView === 'booking' && !currentRide && (
              <RideBooking user={user} onBookRide={handleBookRide} />
            )}
            {(currentView === 'status' || currentRide) && currentRide && (
              <RideStatus
                ride={currentRide}
                user={user}
                onRideUpdate={setCurrentRide}
                onCancelRide={handleRideComplete}
              />
            )}
            {currentView === 'history' && (
              <RideHistory user={user} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
