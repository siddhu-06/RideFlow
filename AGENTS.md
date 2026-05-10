# AGENTS.md

## Project
This repository is RideFlow, a full-stack Uber-style ride-hailing project.

## Build style
- Prefer correctness over speed.
- Inspect existing code before editing.
- Do not remove working features without explaining why.
- Keep frontend, monolith backend, and microservices clearly separated.
- Use environment variables for secrets and URLs.
- Do not commit real API keys, JWT secrets, or passwords.

## Validation
After changing JavaScript/React files:
- Run npm install if dependencies changed.
- Run npm run build in frontend when frontend changes.
- Start backend services to catch syntax/import errors.
- Fix all import path and casing issues.
- Check env variable names.

## Backend rules
- Never return password fields.
- Use JWT verification properly.
- Validate inputs with express-validator or equivalent.
- Use centralized error handling.
- MongoDB geospatial coordinates must be [lng, lat].
- Add /health route to each service.

## Frontend rules
- Use VITE_BASE_URL consistently.
- Do not use VITE_API_URL unless it exists in .env.example.
- Clean up intervals and socket listeners in useEffect.
- Keep protected routes working.

## Microservices rules
- Gateway routes all external requests.
- Services must be independently startable.
- RabbitMQ queues must be durable where appropriate.
- Add safe connection/error handling for RabbitMQ.
- Use docker service names in docker-compose networking.

## Final checklist
Before finishing:
- No syntax errors.
- No unresolved imports.
- No hardcoded secrets.
- README matches real commands.
- Frontend builds.
- Backend services start.
- Docker compose file is present.
