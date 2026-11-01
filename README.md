# Bazar.com - Distributed Bookstore

Distributed Operating Systems lab project built by a two-person team.

## Stack

- Node.js, Express, and TypeScript
- JSON files for persistent storage
- Docker Compose
- HTTP REST APIs with JSON responses

## Services

| Service | Responsibility | Container port |
| --- | --- | --- |
| frontend-service | Public API gateway | 3000 |
| catalog-service | Book catalog and inventory | 3001 |
| order-service | Purchase processing and order history | 3002 |

The frontend forwards search and information requests to the catalog,
and purchase requests to the order service. The order service requests
inventory updates from the catalog.

## Run with Docker

Install and start Docker Desktop with Linux containers enabled.

From the repository root:

```powershell
docker compose up --build -d
docker compose ps
```

The Compose project is named `bazar-bookstore`.
Only the frontend is published to the host at http://localhost:3000.
Port 3000 must be available.

View logs:

```powershell
docker compose logs --tail 30
```

Stop and remove the project containers and network:

```powershell
docker compose down
```

## API examples

Run these commands in PowerShell:

```powershell
Invoke-RestMethod "http://localhost:3000/health"

Invoke-RestMethod "http://localhost:3000/search/distributed%20systems"

Invoke-RestMethod "http://localhost:3000/info/2"

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/purchase/2"
```

Each successful purchase creates an order and decreases stock by one.

## Persistent data

Catalog and order data are stored in:

- `catalog-service/data/catalog.json`
- `order-service/data/orders.json`

Docker Compose bind-mounts these directories into the containers.
Data survives container removal and recreation. Test purchases also
modify these files in the host working directory.

## Verified checks

- All three Docker images build and services start.
- Search and book information work through the frontend.
- A purchase through the frontend creates an order and decreases stock by one.
- Invalid and unknown purchase IDs return the expected error messages.
- An unavailable order service produces HTTP 503 from the frontend.
- Catalog stock and order history survive container removal and recreation.
- Five concurrent catalog decrements with three copies available produce
  three successes, two HTTP 409 rejections, and final stock zero.

## Documentation

- `docs/catalog-api.md`: catalog API documentation and validation results.
- The `docs` directory is also intended for the design report and demonstration output.