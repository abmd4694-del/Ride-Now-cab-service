# 🚗 RideNow - Uber Clone

A full-stack ride-hailing application built with Next.js, Supabase, Leaflet Maps, and Stripe payments.

![RideNow Landing Page](https://images.unsplash.com/photo-1570539946040-2a806ae6745b?w=800)

## 🌟 Features

### For Riders
- **User Authentication** - Sign up/Sign in with Supabase Auth
- **Ride Booking** - Select pickup and dropoff locations on interactive map
- **Address Search** - Type addresses with auto-complete suggestions (OpenStreetMap)
- **Nearby Places** - Quick select from nearby restaurants, hotels, hospitals, etc.
- **Multiple Vehicle Types** - Choose from Economy, Comfort, or Premium
- **Fare Estimation** - See estimated fare before booking
- **Real-time Tracking** - Track driver location on map
- **4-Digit Verification Code** - Secure ride verification system
- **Ride History** - View past rides and download receipts
- **Ratings & Reviews** - Rate drivers after ride completion
- **Stripe Payments** - Secure payment processing

### For Drivers
- **Driver Dashboard** - Accept/decline ride requests
- **Online/Offline Toggle** - Control availability
- **Live Navigation** - See pickup and dropoff on map
- **Code Verification** - Enter rider's code to start trip
- **Earnings Tracker** - View daily and total earnings
- **Real-time Updates** - Instant ride notifications

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| UI Components | shadcn/ui, Lucide Icons |
| Authentication | Supabase Auth |
| Database | MongoDB |
| Maps | Leaflet (OpenStreetMap) |
| Geocoding | Nominatim API (Free) |
| Nearby Places | Overpass API (OpenStreetMap) |
| Payments | Stripe |
| Real-time | Supabase Realtime |
| Notifications | Sonner Toast |

## 📁 Project Structure

```
/app
├── app/
│   ├── api/[[...path]]/route.js    # Backend API routes
│   ├── page.js                      # Main application page
│   ├── layout.js                    # Root layout
│   └── globals.css                  # Global styles
├── components/
│   ├── AuthModal.js                 # Authentication modal
│   ├── RideBooking.js               # Ride booking component
│   ├── RideStatus.js                # Ride tracking component
│   ├── DriverDashboard.js           # Driver interface
│   ├── RideHistory.js               # Past rides list
│   └── MapComponent.js              # Leaflet map wrapper
├── lib/
│   ├── supabase.js                  # Supabase client
│   └── stripe.js                    # Stripe client
└── .env                             # Environment variables
```

## 🔧 Environment Variables

```env
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=ridenow

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx

# App
NEXT_PUBLIC_BASE_URL=https://your-app-url.com
CORS_ORIGINS=*
```

## 📡 API Endpoints

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users` | Create user profile |
| GET | `/api/users/:id` | Get user by ID |
| PATCH | `/api/users/:id` | Update user profile |

### Rides
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rides` | Create new ride request |
| GET | `/api/rides` | Get rides (filter by status/user_id) |
| GET | `/api/rides/active` | Get active ride for user |
| GET | `/api/rides/:id` | Get ride by ID |
| PATCH | `/api/rides/:id` | Update ride status |
| POST | `/api/rides/:id/rating` | Rate a completed ride |

### Drivers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drivers/:id/earnings` | Get driver earnings |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/create-checkout` | Create Stripe checkout |
| GET | `/api/payments/status/:session_id` | Get payment status |
| POST | `/api/webhook/stripe` | Stripe webhook handler |

### Places
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/places/nearby` | Get nearby places |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- Supabase Account
- Stripe Account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-repo/ridenow.git
cd ridenow
```

2. **Install dependencies**
```bash
yarn install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Run the development server**
```bash
yarn dev
```

5. **Open in browser**
```
http://localhost:3000
```

## 🔐 Ride Verification Flow

1. **Rider books a ride** → Status: `requested`
2. **Driver accepts** → 4-digit code generated → Status: `accepted`
3. **Driver arrives** → Status: `arrived`
4. **Driver enters code** → Code verified → Status: `in_progress`
5. **Driver completes ride** → Status: `completed`
6. **Rider pays and rates** → Payment processed

## 💳 Payment Flow

1. Rider clicks "Pay Now" after ride completion
2. Backend creates Stripe Checkout session
3. Rider redirected to Stripe payment page
4. After payment, redirected back with session_id
5. Frontend polls payment status
6. Database updated on successful payment

## 🗺️ Map Features

- **Interactive Map** - Click to select locations
- **Address Search** - Type and search addresses
- **Route Display** - Dotted line between pickup/dropoff
- **Driver Tracking** - Real-time driver location marker
- **Nearby Places** - Auto-fetch popular destinations

## 📱 User Types

### Rider
- Book rides
- Track rides in real-time
- View ride history
- Make payments
- Rate drivers

### Driver
- Go online/offline
- Accept/decline rides
- Update ride status
- Verify rider code
- Track earnings

## 🎨 UI Components Used

- Button, Card, Input, Label
- Dialog, Tabs, Badge
- RadioGroup, Switch, Progress
- Toast notifications (Sonner)

## 📊 Database Collections

### users
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "phone": "string",
  "user_type": "rider | driver",
  "rating": "number",
  "total_rides": "number"
}
```

### rides
```json
{
  "id": "uuid",
  "rider_id": "uuid",
  "driver_id": "uuid",
  "pickup_location": { "lat": "number", "lng": "number" },
  "dropoff_location": { "lat": "number", "lng": "number" },
  "pickup_address": "string",
  "dropoff_address": "string",
  "car_type": "economy | comfort | premium",
  "estimated_fare": "number",
  "estimated_time": "number",
  "status": "requested | accepted | arrived | in_progress | completed | cancelled",
  "verification_code": "string",
  "code_verified": "boolean",
  "rating": "number",
  "payment_status": "pending | paid"
}
```

### payment_transactions
```json
{
  "id": "uuid",
  "session_id": "string",
  "ride_id": "uuid",
  "amount": "number",
  "currency": "string",
  "status": "pending | completed | expired",
  "payment_status": "initiated | paid | expired"
}
```

## 🔮 Future Enhancements

- [ ] Multi-stop rides
- [ ] Promo codes & discounts
- [ ] Saved addresses (Home, Work)
- [ ] In-app messaging
- [ ] SOS emergency feature
- [ ] Driver document verification
- [ ] Surge pricing
- [ ] Ride scheduling
- [ ] Push notifications
- [ ] Mobile app (React Native)

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, email support@ridenow.com or open an issue on GitHub.

---

Built with ❤️ using Next.js and Supabase
