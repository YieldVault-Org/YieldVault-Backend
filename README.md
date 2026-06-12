# YieldVault Backend

Backend REST API for **YieldVault**, a Soroban DeFi yield vault application on
the Stellar network. The service exposes vaults, user positions, analytics and a
mock yield-accrual engine. All on-chain / Stellar interactions are mocked, and
state is held in an in-memory store, so the API runs standalone with no database
or live network.

## Stack

- Node.js + Express
- In-memory store (no database)
- cors, dotenv, morgan, uuid
- Mock Stellar / Soroban service

## Getting started

```bash
npm install
cp .env.example .env
npm start
```

The server boots on `http://localhost:3000` and seeds a few demo vaults.

## API endpoints

All routes are namespaced under `/api`.

| Method | Path                       | Description                                  |
| ------ | -------------------------- | -------------------------------------------- |
| GET    | `/api/health`              | Service liveness probe                       |
| GET    | `/api/vaults`              | List vaults (TVL, APY, total shares)         |
| GET    | `/api/vaults/:id`          | Vault detail                                 |
| GET    | `/api/vaults/:id/positions`| Positions held in a vault                    |
| GET    | `/api/analytics`           | Aggregate TVL and average APY                |
| POST   | `/api/positions/deposit`   | Deposit assets into a vault                  |
| POST   | `/api/positions/withdraw`  | Redeem shares from a vault                    |
| GET    | `/api/positions?user=`     | List positions, optionally filtered by user  |
| GET    | `/api/positions/:id`       | Position detail                              |
| GET    | `/api/transactions?user=`  | Mock transaction history                     |

## Example requests

Deposit into a vault:

```bash
curl -X POST http://localhost:3000/api/positions/deposit \
  -H 'Content-Type: application/json' \
  -d '{"user":"GUSER...","vaultId":"vault_...","amount":1000}'
```

Withdraw shares:

```bash
curl -X POST http://localhost:3000/api/positions/withdraw \
  -H 'Content-Type: application/json' \
  -d '{"user":"GUSER...","vaultId":"vault_...","shares":500}'
```

List a user's positions:

```bash
curl 'http://localhost:3000/api/positions?user=GUSER...'
```

## Yield model

Each vault tracks `totalAssets` (underlying tokens) and `totalShares`
(ownership units). Price per share is `totalAssets / totalShares`. The mock
yield engine grows `totalAssets` over time based on the vault APY while shares
stay constant, so every position appreciates automatically. Accrual is applied
lazily whenever a vault or position is read.

## Project structure

```
src/
  app.js            Express app wiring
  server.js         Entrypoint
  config/           Environment configuration
  routes/           Express routers
  controllers/      HTTP request handlers
  services/         Business logic (vault, position, yield, analytics, stellar)
  middleware/       Logger, validation, error handling
  store/            In-memory store and seed data
  utils/            Logger, ids, math, errors
```

## License

MIT
