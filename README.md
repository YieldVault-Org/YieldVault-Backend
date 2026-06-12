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
| GET    | `/api/analytics`           | Aggregate TVL and average APY                |
| POST   | `/api/positions/deposit`   | Deposit assets into a vault                  |
| POST   | `/api/positions/withdraw`  | Redeem shares from a vault                    |
| GET    | `/api/positions?user=`     | List positions, optionally filtered by user  |
| GET    | `/api/positions/:id`       | Position detail                              |

## License

MIT
