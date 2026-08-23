# RideX

RideX is a full-stack ride-booking platform for passengers, drivers, and administrators. It is designed as an independently engineered portfolio project with secure authentication, driver verification, location-aware fare estimates, ride matching, real-time updates, payments architecture, ratings, notifications, and operations tooling.

## Features

- JWT authentication with bcrypt password hashing
- Role-based access for passengers, drivers, and admins
- Driver onboarding and admin verification
- Leaflet/OpenStreetMap maps with place search and route previews
- Backend-owned fare calculation for bike, auto, and cab
- Ride lifecycle with guarded state transitions
- Nearby driver matching using MongoDB geospatial queries
- Driver acceptance with atomic assignment protection
- Socket.IO ride status and driver location updates
- Payment model with cash settlement and online-provider guard
- Completed-ride ratings with duplicate prevention
- Persistent and live notifications
- Admin statistics and driver verification dashboard
- Responsive React application with lazy-loaded routes

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Leaflet, Socket.IO Client, Lucide React
- Backend: Node.js, Express, Mongoose, MongoDB Atlas, JWT, bcryptjs, Socket.IO
- External services: OpenStreetMap tiles, Nominatim geocoding, OSRM routing

## Architecture

```text
React UI
  -> Axios / Socket.IO
  -> Express routes and middleware
  -> Controllers
  -> Services
  -> Mongoose models
  -> MongoDB
```

Authentication is enforced by JWT middleware. Roles are loaded from MongoDB after token verification. Ride prices are recalculated on the backend, and driver assignment uses a conditional database update.

## Folder Structure

```text
client/
  src/api/             Axios API modules
  src/components/      Reusable UI and map components
  src/context/         Authentication context
  src/hooks/           Socket.IO hooks
  src/pages/           Routed application pages
server/
  config/              Database connection
  controllers/         HTTP request handlers
  middleware/          Authentication, roles, and errors
  models/              User, Driver, Ride, Payment, Rating, Notification
  routes/              Express route modules
  services/            Fare, ride, matching, and notification logic
  socket/              Socket.IO server and event emitters
  test/                Node.js core tests
```

## Installation

Prerequisites: Node.js 20+, MongoDB database, and a modern browser.

```powershell
cd server
npm install
Copy-Item .env.example .env

cd ..\client
npm install
Copy-Item .env.example .env
```

Replace placeholder values in `.env` files. Never commit real credentials.

## Running Locally

Terminal 1:

```powershell
cd server
npm run dev
```

Terminal 2:

```powershell
cd client
npm run dev
```

Client: `http://localhost:5173`
Backend: `http://localhost:5000`

## Environment Variables

Server variables are documented in `server/.env.example`. Client variables are documented in `client/.env.example`.

Required server values:

- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`

Optional payment values are only used when a real provider integration is configured. Secrets must remain server-side.

## API Endpoints

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Driver and rides

- `POST /api/drivers/onboarding`
- `GET /api/drivers/me/status`
- `PATCH /api/drivers/me/online`
- `POST /api/rides`
- `GET /api/rides`
- `PATCH /api/rides/:rideId/cancel`
- `GET /api/driver-rides/requests`
- `POST /api/driver-rides/:rideId/accept`
- `PATCH /api/driver-rides/:rideId/status`

### Payments, ratings, and notifications

- `GET /api/payments/history`
- `POST /api/payments/:rideId/create`
- `POST /api/payments/:rideId/confirm-cash`
- `POST /api/ratings/:rideId`
- `GET /api/ratings/ride/:rideId`
- `GET /api/notifications`
- `PATCH /api/notifications/read-all`

### Admin

- `GET /api/admin/stats`
- `GET /api/admin/users?page=1`
- `GET /api/admin/rides?page=1`
- `GET /api/drivers?status=pending`
- `PATCH /api/drivers/:driverId/verification`

## Testing

```powershell
cd server
npm test

cd ..\client
npm run lint
npm run build
```

The current automated backend tests cover fare calculations and ride lifecycle transitions. API workflows should additionally be exercised with Thunder Client using passenger, approved driver, and admin accounts.

## Real-Time Architecture

Authenticated Socket.IO clients join a user room and authorized ride rooms. Drivers publish validated GeoJSON locations; the server persists them and broadcasts updates to the passenger room. REST ride changes also emit Socket.IO status events.

## Database Models

- `User`: identity, credentials, and role
- `Driver`: vehicle, verification, availability, rating, and location
- `Ride`: participants, route, fare, payment, and lifecycle
- `Payment`: one payment record per ride
- `Rating`: reviewer, reviewed user, ride, score, and comment
- `Notification`: recipient, event type, read state, and optional ride

## Deployment

Recommended deployment:

- Frontend: Vercel, with `VITE_API_URL` and `VITE_SOCKET_URL`
- Backend: Render or another Node-compatible host
- Database: MongoDB Atlas

Configure production CORS using the deployed frontend origin. Set production secrets through the hosting provider, not source control. The payment provider integration remains guarded until server-side order creation and signature verification are configured.

## Screenshots

Add screenshots of the landing page, booking map, driver desk, and admin operations dashboard before publishing the portfolio repository.

## Future Improvements

- Complete Razorpay order creation and signature verification
- Cloudinary document uploads
- Dedicated active-ride and driver navigation pages
- Automated API and Socket.IO integration tests
- Analytics charts and richer admin filtering
- Production map-provider quotas and observability

## Author

Built by the RideX project author as a full-stack portfolio application.
