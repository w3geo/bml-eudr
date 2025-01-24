# BML-EUDR

## Database

### Connection

By default, a local PGlite database is used in development mode. To connect to a remote PostgreSQL database, set the `DATABASE_URL` and `DATABASE_CA_CERT` environment variable.

### Migrations

This project uses [Drizzle](https://orm.drizzle.team) for ORM and schema management. Instead of talking directly to the database, tables and relations are defined in `server/db/schema/`. When making changes to the database, migrations can be auto-generated. The process is similar to making git commits: Find a short name/slug describing your changes (it will become the name of the migration, e.g. `my-change`), then run

    npx drizzle-kit generate --name=my-change

This will create a migration in `server/db/migrations` and update the migrations metadata.

After that, the development server (if running) needs to be restarted. Migrations will automatically be executed upon server startup (see `server/plugins/database.js`).

### Database browser

Drizzle provides Studio, a database browser to see what's going on in the databse. To use it, run

    npx drizzle-kit studio

and open https://local.drizzle.studio in your browser. The connection parameters of the current environment will be used.

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

    npm install

## Development Server

Start the development server on `http://localhost:3000`:

    npm run dev

**NOTE:** In development, when using Safari as browser, you need to use https to make user sessions work:

    npm run dev -- --https

Then open `https://localhost:3000` in Safari.

## Production

Build the application for production:

    npm run build

Locally preview production build:

    npm run preview

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
