# Catalog Service API

The catalog service manages four books using JSON-file persistence.

## Run locally

From the catalog-service directory:

```powershell
npm ci
npm run build
npm start
```

Base URL: http://localhost:3001

## Endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | /health | Check service availability |
| GET | /search/:topic | Return matching book IDs and titles |
| GET | /info/:id | Return full book information |
| PUT | /update/:id | Change price and/or adjust stock |

Supported topics:
- distributed systems
- undergraduate school

Topic matching ignores case and surrounding whitespace.
An unknown topic returns HTTP 200 with an empty array.

## Book information

GET /info/2 returns a JSON object containing:

- id
- title
- topic
- quantity
- price

## Updates

Requests must use Content-Type: application/json.

Change a price:

```json
{"price":55}
```

Add five copies:

```json
{"quantityChange":5}
```

Remove one copy for a purchase:

```json
{"quantityChange":-1}
```

Both fields may be included in one request.
Successful updates return HTTP 200 with the updated book.

The order service must send quantityChange: -1.
It must not calculate and submit an absolute stock quantity.
The catalog can reject the decrement even if an earlier lookup
showed available stock.

## Errors

Errors use this JSON structure:

```json
{"error":"Description of the problem"}
```

| Status | Meaning |
|---|---|
| 400 | Invalid ID, invalid update fields, or invalid values |
| 404 | Book does not exist |
| 409 | Insufficient stock or invalid resulting quantity |
| 500 | Catalog read or write failed |

Prices must be finite nonnegative numbers.
Stock adjustments must be safe integers.
The resulting quantity must be a nonnegative safe integer.

## Persistence and concurrency

Inventory is stored in catalog-service/data/catalog.json.

Updates are queued within a single catalog process.
Each update reads the current inventory, checks the resulting
quantity, writes a temporary file, and renames it over the catalog.

This prevents concurrent updates within that process from
overwriting one another. Multiple catalog processes sharing the
same file are not supported.

## Verified checks

- TypeScript build
- Search and book information
- Missing and invalid book IDs
- Persistence after restart
- Price update
- Insufficient-stock rejection
- Unknown topic returns an empty array
- Negative-price rejection
- Fractional-stock rejection
- Unsupported-field rejection

The earlier concurrent update test reached zero stock, but its
success and rejection counts still need confirmation.