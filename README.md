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

## License

MIT
