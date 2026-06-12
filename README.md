# RideFlow

RideFlow is a final-year Uber-style ride-hailing project built from the supplied monolith MERN reference and the microservices refactor reference.

## Architecture

```text
React/Vite frontend
  -> Monolith mode: backend on :3000 with Express, MongoDB, Socket.IO, Google Maps APIs
  -> Microservices mode: gateway on :3000
       /user/*    -> user service on :3001
       /captain/* -> captain service on :3002
       /ride/*    -> ride service on :3003

RabbitMQ queues:
  ride service -> new-ride -> captain service long-polling
  ride service -> ride-accepted -> user service long-polling
```

## Monolith Setup

Recommended Windows launcher:

```powershell
cd D:\AAEEOONN\RideFlow
powershell -ExecutionPolicy Bypass -File .\scripts\start-monolith.ps1
```

This stops stale listeners on ports `3000` and `5173`, checks MongoDB, starts the backend, builds the Vite frontend, and serves it on `5173`.

Manual mode:

```bash
cd backend
npm install
copy .env.example .env
npm start
```

Set real values in `backend/.env`. `GOOGLE_MAPS_API` must enable Geocoding, Distance Matrix, Places, and Maps JavaScript APIs.

Health check:

```bash
GET http://localhost:3000/health
```

## Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:5173`. The frontend uses `VITE_BASE_URL`, not `VITE_API_URL`. `npm run dev` builds with Vite and serves the built app with `frontend/server.js`; `npm run vite:dev` is available only if your local Node/Vite setup can spawn `esbuild` without Windows `EPERM` errors.

## Monolith APIs

Users:
- `POST /users/register`
- `POST /users/login`
- `GET /users/profile`
- `GET /users/logout`

Captains:
- `POST /captains/register`
- `POST /captains/login`
- `GET /captains/profile`
- `GET /captains/logout`

Maps:
- `GET /maps/get-coordinates?address=`
- `GET /maps/get-distance-time?origin=&destination=`
- `GET /maps/get-suggestions?input=`

Rides:
- `POST /rides/create`
- `GET /rides/get-fare?pickup=&destination=`
- `POST /rides/confirm`
- `GET /rides/start-ride?rideId=&otp=`
- `POST /rides/end-ride`

Fare formula:

```text
Fare = baseFare + distanceKm * perKmRate + durationMin * perMinuteRate
auto: base 30, perKm 10, perMinute 2
car:  base 50, perKm 15, perMinute 3
moto: base 20, perKm 8,  perMinute 1.5
```

## Socket.IO Events

Client to server:
- `join` with `{ userId, userType: "user" | "captain" }`
- `update-location-captain` with `{ userId, location: { ltd, lng } }`

Server to client:
- `new-ride`
- `ride-confirmed`
- `ride-started`
- `ride-ended`

Captain geospatial data is stored as GeoJSON with `[lng, lat]` coordinates.

## Microservices Setup

Recommended Windows launcher:

```powershell
cd D:\AAEEOONN\RideFlow
powershell -ExecutionPolicy Bypass -File .\scripts\start-microservices.ps1
```

RabbitMQ is still supported and preferred, but local development now falls back to internal HTTP notifications if RabbitMQ is not installed. That means the services can run even when `choco install rabbitmq -y` fails on a non-admin Windows shell.

Run each service in a separate terminal:

```bash
cd microservices/gateway && npm install && npm start
cd microservices/user && npm install && npm start
cd microservices/captain && npm install && npm start
cd microservices/ride && npm install && npm start
```

Copy each `.env.example` to `.env`. Use the same `JWT_SECRET` across user, captain, and ride services so delegated auth works.

Gateway endpoints:
- `POST /user/register`
- `POST /user/login`
- `GET /user/logout`
- `GET /user/profile`
- `GET /user/accepted-ride`
- `POST /captain/register`
- `POST /captain/login`
- `GET /captain/logout`
- `GET /captain/profile`
- `PATCH /captain/toggle-availability`
- `GET /captain/new-ride`
- `POST /ride/create-ride`
- `PUT /ride/accept-ride`

## Docker

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:5173`
- Gateway: `http://localhost:3000`
- MongoDB: `localhost:27017`
- RabbitMQ: `localhost:5672`
- RabbitMQ management UI: `http://localhost:15672` (`guest` / `guest`)

Docker networking uses service names: `mongodb`, `rabbitmq`, `gateway`, `user-service`, `captain-service`, and `ride-service`.

## Environment Variables

Monolith backend: see `backend/.env.example`.

Frontend: see `frontend/.env.example`.

Microservices: see:
- `microservices/user/.env.example`
- `microservices/captain/.env.example`
- `microservices/ride/.env.example`
- `microservices/gateway/.env.example`

Do not commit real Google API keys, JWT secrets, passwords, or production URLs.

## Testing Checklist

- `cd backend && npm install && npm start`
- `GET /health` returns `rideflow-monolith`.
- `cd frontend && npm run lint && npm run build`
- Register/login as a user.
- Register/login as a captain.
- Captain joins socket and sends location every 10 seconds.
- User searches pickup/destination and gets suggestions.
- User selects a vehicle and creates a ride.
- Nearby active captains receive `new-ride`.
- Captain accepts ride.
- User sees captain details and OTP.
- Captain starts ride with OTP.
- Captain ends ride.
- User and captain screens navigate back correctly.
- Each microservice `/health` endpoint starts independently.

## Common Errors

- Google Maps endpoints return `Google Maps API key is not configured`: add a valid key to backend and frontend env files.
- Fare or suggestions fail: enable Geocoding, Distance Matrix, Places, and Maps JavaScript APIs on the same Google key.
- Ride service auth fails in microservices: use the same `JWT_SECRET` for user, captain, and ride services.
- No captains receive rides: captain must be logged in, joined to Socket.IO, active, and within 2km in monolith mode; in microservice mode captain availability must be toggled on.
- RabbitMQ unavailable: services keep running and retry locally, but queue flows need RabbitMQ started.
