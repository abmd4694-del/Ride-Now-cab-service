import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// MongoDB connection
let client
let db

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_fallback')

async function connectToMongo() {
  if (!client) {
    try {
      // Connect to MongoDB using the Server API
      client = new MongoClient(process.env.MONGO_URL, {
        serverApi: {
          version: '1',
          strict: true,
          deprecationErrors: true,
        }
      })
      await client.connect()
      db = client.db(process.env.DB_NAME)
    } catch (e) {
      client = null
      db = null
      throw e
    }
  }
  return db
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // ==================== ROOT ENDPOINTS ====================
    if ((route === '/root' || route === '/') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "RideNow API v1.0" }))
    }

    // ==================== USER ENDPOINTS ====================
    
    // Create user profile - POST /api/users
    if (route === '/users' && method === 'POST') {
      const body = await request.json()
      
      const userObj = {
        id: body.id || uuidv4(),
        email: body.email,
        name: body.name,
        phone: body.phone || '',
        user_type: body.user_type || 'rider',
        created_at: new Date(),
        updated_at: new Date(),
        rating: 5.0,
        total_rides: 0
      }

      // Check if user already exists
      const existing = await db.collection('users').findOne({ id: userObj.id })
      if (existing) {
        return handleCORS(NextResponse.json(existing))
      }

      await db.collection('users').insertOne(userObj)
      const { _id, ...cleanUser } = userObj
      return handleCORS(NextResponse.json(cleanUser))
    }

    // Get user by ID - GET /api/users/:id
    const userIdMatch = route.match(/^\/users\/([^/]+)$/)
    if (userIdMatch && method === 'GET') {
      const userId = userIdMatch[1]
      const user = await db.collection('users').findOne({ id: userId })
      
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        ))
      }

      const { _id, ...cleanUser } = user
      return handleCORS(NextResponse.json(cleanUser))
    }

    // Update user - PATCH /api/users/:id
    if (userIdMatch && method === 'PATCH') {
      const userId = userIdMatch[1]
      const body = await request.json()
      
      const result = await db.collection('users').findOneAndUpdate(
        { id: userId },
        { $set: { ...body, updated_at: new Date() } },
        { returnDocument: 'after' }
      )

      if (!result) {
        return handleCORS(NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        ))
      }

      const { _id, ...cleanUser } = result
      return handleCORS(NextResponse.json(cleanUser))
    }

    // ==================== RIDE ENDPOINTS ====================

    // Generate 4-digit verification code
    const generateVerificationCode = () => {
      return Math.floor(1000 + Math.random() * 9000).toString()
    }

    // Create ride - POST /api/rides
    if (route === '/rides' && method === 'POST') {
      const body = await request.json()
      
      const rideObj = {
        id: uuidv4(),
        rider_id: body.rider_id,
        driver_id: null,
        driver: null,
        pickup_location: body.pickup_location,
        dropoff_location: body.dropoff_location,
        pickup_address: body.pickup_address || 'Pickup Location',
        dropoff_address: body.dropoff_address || 'Dropoff Location',
        car_type: body.car_type || 'economy',
        estimated_fare: body.estimated_fare || 0,
        estimated_time: body.estimated_time || 0,
        status: 'requested',
        verification_code: null, // Will be set when driver accepts
        code_verified: false,
        created_at: new Date(),
        updated_at: new Date(),
        completed_at: null,
        rating: null,
        payment_status: 'pending'
      }

      await db.collection('rides').insertOne(rideObj)
      const { _id, ...cleanRide } = rideObj
      return handleCORS(NextResponse.json(cleanRide))
    }

    // Get rides - GET /api/rides
    if (route === '/rides' && method === 'GET') {
      const url = new URL(request.url)
      const status = url.searchParams.get('status')
      const userId = url.searchParams.get('user_id')
      
      let query = {}
      if (status) query.status = status
      if (userId) query.$or = [{ rider_id: userId }, { driver_id: userId }]

      const rides = await db.collection('rides')
        .find(query)
        .sort({ created_at: -1 })
        .limit(50)
        .toArray()

      const cleanRides = rides.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanRides))
    }

    // Get active ride - GET /api/rides/active
    if (route === '/rides/active' && method === 'GET') {
      const url = new URL(request.url)
      const userId = url.searchParams.get('user_id')
      
      if (!userId) {
        return handleCORS(NextResponse.json({ error: "user_id required" }, { status: 400 }))
      }

      const activeRide = await db.collection('rides').findOne({
        $or: [{ rider_id: userId }, { driver_id: userId }],
        status: { $in: ['requested', 'accepted', 'arrived', 'in_progress'] }
      })

      if (!activeRide) {
        return handleCORS(NextResponse.json({}))
      }

      const { _id, ...cleanRide } = activeRide
      return handleCORS(NextResponse.json(cleanRide))
    }

    // Get ride by ID - GET /api/rides/:id
    const rideIdMatch = route.match(/^\/rides\/([^/]+)$/)
    if (rideIdMatch && method === 'GET') {
      const rideId = rideIdMatch[1]
      const ride = await db.collection('rides').findOne({ id: rideId })
      
      if (!ride) {
        return handleCORS(NextResponse.json(
          { error: "Ride not found" },
          { status: 404 }
        ))
      }

      const { _id, ...cleanRide } = ride
      return handleCORS(NextResponse.json(cleanRide))
    }

    // Update ride - PATCH /api/rides/:id
    if (rideIdMatch && method === 'PATCH') {
      const rideId = rideIdMatch[1]
      const body = await request.json()
      
      const updateData = { ...body, updated_at: new Date() }
      
      // Generate verification code when driver accepts
      if (body.status === 'accepted' && body.driver_id) {
        updateData.verification_code = generateVerificationCode()
      }
      
      // Mark code as verified when driver starts trip with correct code
      if (body.verify_code) {
        const existingRide = await db.collection('rides').findOne({ id: rideId })
        if (existingRide && existingRide.verification_code === body.verify_code) {
          updateData.code_verified = true
          updateData.status = 'in_progress'
        } else {
          return handleCORS(NextResponse.json(
            { error: "Invalid verification code" },
            { status: 400 }
          ))
        }
        delete updateData.verify_code
      }
      
      if (body.status === 'completed') {
        updateData.completed_at = new Date()
      }

      const result = await db.collection('rides').findOneAndUpdate(
        { id: rideId },
        { $set: updateData },
        { returnDocument: 'after' }
      )

      if (!result) {
        return handleCORS(NextResponse.json(
          { error: "Ride not found" },
          { status: 404 }
        ))
      }

      const { _id, ...cleanRide } = result
      return handleCORS(NextResponse.json(cleanRide))
    }

    // Emergency SOS - POST /api/rides/:id/sos
    const sosMatch = route.match(/^\/rides\/([^/]+)\/sos$/)
    if (sosMatch && method === 'POST') {
      const rideId = sosMatch[1]
      
      const updateData = { 
        status: 'cancelled', 
        sos_triggered: true,
        updated_at: new Date(),
        completed_at: new Date()
      }
      
      const result = await db.collection('rides').findOneAndUpdate(
        { id: rideId },
        { $set: updateData },
        { returnDocument: 'after' }
      )
      
      if (!result) {
        return handleCORS(NextResponse.json(
          { error: "Ride not found" },
          { status: 404 }
        ))
      }

      const { _id, ...cleanRide } = result
      return handleCORS(NextResponse.json(cleanRide))
    }

    // Rate ride - POST /api/rides/:id/rating
    const ratingMatch = route.match(/^\/rides\/([^/]+)\/rating$/)
    if (ratingMatch && method === 'POST') {
      const rideId = ratingMatch[1]
      const body = await request.json()
      
      const result = await db.collection('rides').findOneAndUpdate(
        { id: rideId },
        { $set: { rating: body.rating, updated_at: new Date() } },
        { returnDocument: 'after' }
      )

      if (!result) {
        return handleCORS(NextResponse.json(
          { error: "Ride not found" },
          { status: 404 }
        ))
      }

      // Update driver's average rating
      if (result.driver_id) {
        const driverRides = await db.collection('rides')
          .find({ driver_id: result.driver_id, rating: { $ne: null } })
          .toArray()
        
        const avgRating = driverRides.reduce((sum, r) => sum + r.rating, 0) / driverRides.length
        
        await db.collection('users').updateOne(
          { id: result.driver_id },
          { $set: { rating: avgRating } }
        )
      }

      const { _id, ...cleanRide } = result
      return handleCORS(NextResponse.json(cleanRide))
    }

    // ==================== DRIVER ENDPOINTS ====================

    // Get driver earnings - GET /api/drivers/:id/earnings
    const earningsMatch = route.match(/^\/drivers\/([^/]+)\/earnings$/)
    if (earningsMatch && method === 'GET') {
      const driverId = earningsMatch[1]
      
      // Get all completed rides for this driver
      const completedRides = await db.collection('rides')
        .find({ driver_id: driverId, status: 'completed' })
        .toArray()

      // Calculate today's earnings
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const todayEarnings = completedRides
        .filter(r => new Date(r.completed_at) >= today)
        .reduce((sum, r) => sum + (r.estimated_fare || 0), 0)

      const totalEarnings = completedRides
        .reduce((sum, r) => sum + (r.estimated_fare || 0), 0)

      return handleCORS(NextResponse.json({
        today: todayEarnings,
        total: totalEarnings,
        rides_count: completedRides.length
      }))
    }

    // ==================== PAYMENT ENDPOINTS ====================

    // Create checkout session - POST /api/payments/create-checkout
    if (route === '/payments/create-checkout' && method === 'POST') {
      const body = await request.json()
      
      const { ride_id, amount, origin_url } = body

      if (!ride_id || !amount || !origin_url) {
        return handleCORS(NextResponse.json(
          { error: "ride_id, amount, and origin_url are required" },
          { status: 400 }
        ))
      }

      // Create payment transaction record
      const transactionId = uuidv4()
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'RideNow - Ride Payment',
                description: `Ride ID: ${ride_id}`,
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin_url}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: origin_url,
        metadata: {
          ride_id,
          transaction_id: transactionId
        },
      })

      // Store payment transaction
      await db.collection('payment_transactions').insertOne({
        id: transactionId,
        session_id: session.id,
        ride_id,
        amount,
        currency: 'usd',
        status: 'pending',
        payment_status: 'initiated',
        created_at: new Date(),
        updated_at: new Date()
      })

      return handleCORS(NextResponse.json({
        url: session.url,
        session_id: session.id
      }))
    }

    // Get payment status - GET /api/payments/status/:session_id
    const paymentStatusMatch = route.match(/^\/payments\/status\/([^/]+)$/)
    if (paymentStatusMatch && method === 'GET') {
      const sessionId = paymentStatusMatch[1]

      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId)
        
        // Update transaction in database
        await db.collection('payment_transactions').updateOne(
          { session_id: sessionId },
          { 
            $set: { 
              status: session.status,
              payment_status: session.payment_status,
              updated_at: new Date()
            } 
          }
        )

        // Update ride payment status if paid
        if (session.payment_status === 'paid' && session.metadata?.ride_id) {
          await db.collection('rides').updateOne(
            { id: session.metadata.ride_id },
            { $set: { payment_status: 'paid', updated_at: new Date() } }
          )
        }

        return handleCORS(NextResponse.json({
          status: session.status,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency
        }))
      } catch (error) {
        return handleCORS(NextResponse.json(
          { error: "Payment session not found" },
          { status: 404 }
        ))
      }
    }

    // Stripe Webhook - POST /api/webhook/stripe
    if (route === '/webhook/stripe' && method === 'POST') {
      const body = await request.text()
      const sig = request.headers.get('stripe-signature')

      let event

      try {
        // For now, just parse the body directly
        // In production, you'd verify the webhook signature
        event = JSON.parse(body)
      } catch (err) {
        return handleCORS(NextResponse.json(
          { error: `Webhook Error: ${err.message}` },
          { status: 400 }
        ))
      }

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object
          
          // Update payment transaction
          await db.collection('payment_transactions').updateOne(
            { session_id: session.id },
            { 
              $set: { 
                status: 'completed',
                payment_status: 'paid',
                updated_at: new Date()
              } 
            }
          )

          // Update ride payment status
          if (session.metadata?.ride_id) {
            await db.collection('rides').updateOne(
              { id: session.metadata.ride_id },
              { $set: { payment_status: 'paid', updated_at: new Date() } }
            )
          }
          break

        case 'checkout.session.expired':
          const expiredSession = event.data.object
          
          await db.collection('payment_transactions').updateOne(
            { session_id: expiredSession.id },
            { 
              $set: { 
                status: 'expired',
                payment_status: 'expired',
                updated_at: new Date()
              } 
            }
          )
          break

        default:
          console.log(`Unhandled event type ${event.type}`)
      }

      return handleCORS(NextResponse.json({ received: true }))
    }

    // ==================== STATUS ENDPOINT ====================
    if (route === '/status' && method === 'GET') {
      return handleCORS(NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }))
    }

    // ==================== NEARBY PLACES ENDPOINT ====================
    // GET /api/places/nearby?lat=xxx&lng=xxx
    if (route === '/places/nearby' && method === 'GET') {
      const url = new URL(request.url)
      const lat = url.searchParams.get('lat')
      const lng = url.searchParams.get('lng')

      if (!lat || !lng) {
        return handleCORS(NextResponse.json(
          { error: "lat and lng are required" },
          { status: 400 }
        ))
      }

      try {
        // Use Nominatim reverse geocoding with nearby search
        const radius = 1000 // 1km radius
        const categories = ['tourism', 'amenity', 'shop', 'transport']
        
        // Search for nearby places using Overpass API (OpenStreetMap)
        const overpassQuery = `
          [out:json][timeout:10];
          (
            node["amenity"~"restaurant|cafe|hospital|pharmacy|bank|fuel"](around:${radius},${lat},${lng});
            node["tourism"~"hotel|attraction|museum"](around:${radius},${lat},${lng});
            node["shop"~"mall|supermarket"](around:${radius},${lat},${lng});
            node["public_transport"="station"](around:${radius},${lat},${lng});
          );
          out body 10;
        `
        
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: `data=${encodeURIComponent(overpassQuery)}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })

        const data = await response.json()
        
        const places = data.elements?.map(place => ({
          id: place.id,
          name: place.tags?.name || place.tags?.amenity || place.tags?.tourism || 'Unknown Place',
          type: place.tags?.amenity || place.tags?.tourism || place.tags?.shop || 'place',
          lat: place.lat,
          lng: place.lon,
          address: place.tags?.['addr:street'] ? 
            `${place.tags?.['addr:housenumber'] || ''} ${place.tags?.['addr:street']}`.trim() : 
            null
        })).filter(p => p.name !== 'Unknown Place') || []

        return handleCORS(NextResponse.json({ places }))
      } catch (error) {
        console.error('Nearby places error:', error)
        return handleCORS(NextResponse.json({ places: [] }))
      }
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` },
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
