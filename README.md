# BML-EUDR

## Local database

By default, a local PGlite database is used in development mode. To connect to a remote PostgreSQL database, set the `DATABASE_URL` environment variable.

To debug the local database, stop the development server. For a minimal database server with [pg-gateway](https://github.com/supabase-community/pg-gateway), run

    npm run pglite

and connect with `psql`. Note that IDEs like DBeaver currently do not work with PGlite.

## AMA Client certificate

To convert the AMA client certificate to .crt and .key files for use with Node HTTPS Agent's `cert` and `key` properties, use the following:

    openssl pkcs12 -in BML-Partner.pfx -nocerts -out temp.key
    openssl rsa -in temp.key -out ama-partner.key # remove passphrase
    openssl pkcs12 -in BML-Partner.pfx -clcerts -nokeys -out ama-partner.crt

`temp.key` can be deleted. `ama-partner.crt` is used for the agent's `cert`, `ama-partner.key` for the agent's `key`.

# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
