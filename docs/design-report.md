# Bazar.com - Design Report

## Architecture and technology

Bazar.com is a distributed bookstore containing four books in two topics:
distributed systems and undergraduate school. It uses two tiers and three
independent services: a frontend API gateway, a catalog service, and an
order service. All communication between services uses HTTP REST with
JSON responses. A PowerShell client accesses the frontend; no graphical
interface is required.

The implementation uses Node.js, Express, and TypeScript. Express provides
lightweight HTTP routing, while TypeScript provides compile-time checks
for interfaces and function arguments. Asynchronous network and file
operations allow the services to handle overlapping requests without
creating application-managed threads.

Each service runs in its own Linux container. Docker Compose builds the
images and creates a shared network. The frontend uses the addresses
http://catalog:3001 and http://order:3002 to reach the backends.
Only the frontend is published to the host, at http://localhost:3000.
Backend URLs are configurable through environment variables, allowing
services to communicate across machines when reachable addresses and
network access are configured.

## Interfaces and request processing

The frontend exposes the following operations:

| Method | Endpoint | Destination |
| --- | --- | --- |
| GET | /search/:topic | Catalog |
| GET | /info/:id | Catalog |
| POST | /purchase/:id | Order |

Each service also provides a health endpoint. These endpoints report that
the service is responding; they do not verify all dependencies.

Search returns matching book IDs and titles. Topic matching ignores case
and surrounding whitespace. An unknown topic returns an empty array.
Information requests return the book ID, title, topic, quantity, and price.
The frontend preserves backend HTTP status codes and JSON response bodies.

The catalog additionally exposes PUT /update/:id. Its JSON body accepts
price, quantityChange, or both. Stock changes are relative adjustments:
a purchase sends {"quantityChange":-1}, and replenishment can send a positive
adjustment. Invalid IDs and update values return HTTP 400, missing books
return 404, and updates that would produce invalid stock return 409.

For a purchase, the order service first queries the catalog and checks
availability. It then requests a decrement of one copy. The catalog
checks the current stock again while processing the update, so an earlier
availability check does not guarantee that the decrement will succeed.
After a successful decrement, the order service saves an order containing
an ID, book ID, title, price, and timestamp. It prints "bought book" followed
by the title and returns HTTP 201 with the order.

If order storage fails, the order service attempts a compensating stock
increment and returns HTTP 500. A failed compensation is logged.

## Persistence and concurrency

The catalog is stored in catalog-service/data/catalog.json, and order
history is stored in order-service/data/orders.json. Compose bind-mounts
both data directories into their containers, so changes survive container
removal and recreation.

Catalog updates run through a promise queue within one process. Each
update reads the latest catalog, checks the resulting quantity, writes
a complete temporary file, and renames it over the catalog file.
This prevents overlapping updates from overwriting each other within
that process and avoids exposing a partially written catalog during
normal file replacement.

Order writes use a separate promise queue. The service reads existing
orders, assigns an ID one greater than the largest existing ID, appends
the record, and writes the complete array. Both queues recover after a
failed operation so later requests can still run.

Concurrent reads and network requests can overlap, while writes to each
service's data file are serialized. These queues provide coordination
within a single process only.

## Design choices and tradeoffs

JSON files keep the implementation small and easy to inspect without
requiring a database server. The cost is that each operation reads or
rewrites a whole file, which is suitable for this small catalog but does
not scale well to large datasets.

Separate services isolate responsibilities and make network interactions
explicit. They also introduce partial failures: the catalog can be
available while the order service is unavailable, or one step of a
purchase can succeed while a later step fails.

The frontend and order-to-catalog client use five-second HTTP timeouts.
The frontend returns HTTP 503 when a backend request fails or its response
cannot be parsed as JSON. Purchases are not automatically retried because
repeating a request could create another order.

Multi-stage Docker builds compile TypeScript and retain production
dependencies and compiled JavaScript in the runtime images. Compose
provides repeatable service networking. Its depends_on configuration
controls startup order but does not guarantee application readiness.

## Known limitations and possible improvements

Inventory changes and order storage are not one transaction. A process
crash after the decrement, or a failed compensating update, can leave
inventory and order history inconsistent. A timed-out decrement may also
have completed without the caller receiving confirmation. A durable
purchase workflow with operation IDs and reconciliation could track
and resolve incomplete purchases.

A client timeout does not prove that a purchase failed. Retrying can
create a duplicate order because there are no idempotency keys. A future
version could persist a unique request key and return the original result
for repeated submissions.

Order storage writes directly to orders.json. An interrupted write could
leave a damaged file. Temporary-file replacement would reduce this risk;
SQLite transactions could provide stronger local storage guarantees.
Neither service supports multiple processes safely sharing its data file.
Replication would require storage and coordination designed for it.

The order records the price returned by its initial catalog lookup.
A concurrent price change may therefore produce an order using an earlier
price. The order could instead use the book returned by the successful
decrement, with an explicit policy defining when the price is fixed.

Additional improvements include startup health checks, dependency
readiness checks, authentication for inventory updates, and automated
tests for service failures and concurrent purchases.

## Running and validation

Install Docker Desktop with Linux containers enabled. From the repository
root, run:

```powershell
docker compose up --build -d
docker compose ps
```

Port 3000 must be available. Test the public API with:

```powershell
Invoke-RestMethod "http://localhost:3000/health"
Invoke-RestMethod "http://localhost:3000/search/distributed%20systems"
Invoke-RestMethod "http://localhost:3000/info/2"
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/purchase/2"
```

A successful purchase changes persistent data and decreases stock by one.
Inspect logs and stop the project with:

```powershell
docker compose logs --no-color --tail 30
docker compose down
```

The recorded demonstration in docs/demo-output.txt shows all three
containers running, successful search and information requests, and a
purchase that decreased book 2's stock from 9 to 8. The order service
printed the required purchase message.

Earlier checks confirmed HTTP 503 when the order service was stopped,
persistence after container recreation, and catalog concurrency behavior.
Starting with three copies, five concurrent decrement requests produced
three successes, two HTTP 409 rejections, and final stock zero.
The detailed catalog API and validation summary are in docs/catalog-api.md.