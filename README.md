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

### Deleting an account on request

Users can delete their account on the "Mein Konto" page. When that is not possible and a deletion is requested via service.entwaldung@bmluk.gv.at, the request has to include the reference number ("Identifikationsnummer") of one of the user's statements, or the e-mail address for e-mail logins. In the TRACES UI, that statement's "Company Internal Ref" identifies the user: it is a hash of the user id (see `getInternalReferenceHash()` in `server/utils/soap-traces.js`).

1. In the TRACES UI, find all statements with that "Company Internal Ref" and note the UUID in the URL of each statement: it is the `sdId`. Delete their copies in this application's database:

       DELETE FROM statement_contents WHERE "sdId" IN ('<sdId>', ...);

2. AMA and USP logins have no row in the `users` table. For e-mail logins, the user id is the e-mail address. For all other logins, find the user id by hashing all ids, with `DATABASE_URL` and `DATABASE_CA_CERT` of the production database set:

   ```sh
   node --input-type=module -e "
   import { createHash } from 'crypto';
   import pg from 'pg';
   const url = new URL(process.env.DATABASE_URL);
   const client = new pg.Client({
     host: url.hostname, port: parseInt(url.port), user: url.username, password: url.password,
     database: url.pathname.slice(1), ssl: { rejectUnauthorized: false, ca: process.env.DATABASE_CA_CERT },
   });
   await client.connect();
   const { rows } = await client.query('SELECT id FROM users');
   // Must match getInternalReferenceHash() in server/utils/soap-traces.js
   const hash = (id) => BigInt('0x' + createHash('sha256').update(String(id)).digest('hex')).toString(36).slice(0, 14);
   console.log(rows.filter((row) => hash(row.id) === process.argv[1]).map((row) => row.id));
   await client.end();
   " <Company Internal Ref>
   ```

   Then delete the row:

       DELETE FROM users WHERE id = '<id>';

## Search engines

Search engines are kept out unless the site is explicitly made indexable, which only production does. robots.txt, `X-Robots-Tag` headers, robots meta tags and the sitemap are handled by [`@nuxtjs/robots`](https://nuxtseo.com/docs/robots) and [`@nuxtjs/sitemap`](https://nuxtseo.com/docs/sitemap), configured in `nuxt.config.js`. Both read these environment variables:

* `NUXT_SITE_URL`: canonical origin, e.g. `https://example.com`. Set it on every deployment, so the sitemap and canonical links use the public domain instead of the request host.
* `NUXT_SITE_INDEXABLE=true`: set it on production only, at build and run time (on DigitalOcean: scope "Build and run time"). Without it, robots.txt disallows everything, and all responses get `noindex, nofollow` headers and meta tags. It has to be there at build time, because the module bakes a `noindex` header for files in `public/` into non-indexable builds.

To check robots rules locally, append `?mockProductionEnv` to a URL in development.

## AMA Client certificate

To convert the AMA client certificate to .crt and .key files for use with Node HTTPS Agent's `cert` and `key` properties, use the following:

    openssl pkcs12 -in BML-Partner.pfx -nocerts -out temp.key
    openssl rsa -in temp.key -out ama-partner.key # remove passphrase
    openssl pkcs12 -in BML-Partner.pfx -clcerts -nokeys -out ama-partner.crt

`temp.key` can be deleted. `ama-partner.crt` is used for the agent's `cert`, `ama-partner.key` for the agent's `key`.

## Import LFBIS-INSPIRE link tables

LFBIS-INSPIRE link tables are provided by AMA. When handling this data, be aware that the process is subject to GDPR regulations. This means: delete all data when finished processing, and use it only in the way described in this process.

Link data is provided as a set of two CSV files, one for fields ("SCHLAEGE" and one for farms ("HOFSTELLEN"). To bring them into the correct form, use the `scripts/lfbis-inspire.js` script, e.g.
```sh
node scripts/lfbis-inspire.js --in VERKN_INSPIRE_SCHLAEGE_BNR.csv --out schlaege.csv
node scripts/lfbis-inspire.js --in VERKN_INSPIRE_HOFSTELLEN_BNR.csv --out hofstellen.csv
```
Now import the `schlaege.csv` and `hofstellen.csv` files into the database, using your preferred database management tool:

* `schlaege.csv` goes into the `lfbis_field` table
* `hofstellen.csv` goes into the `lfbis_farm` table

Be sure to empty existing contents of the tables before importing new data!

## TRACES API v1 → v3 changes

The TRACES EUDR API was updated from V1 (separate `EUDRSubmissionServiceV1` / `EUDRRetrievalServiceV1` endpoints) to V3 (`EUDRDueDiligenceStatementServiceV3`, unified). The following notes document fields and business rules that are **not obvious from the V3 XSD alone** but are enforced at runtime.

### Operator address is required

Although `operatorAddress` inside `representedOperator` is marked optional in the V3 schema, TRACES enforces a business rule that requires `street` (and therefore the full structured address) when submitting as `REPRESENTATIVE_OPERATOR`. The existing combined address string (format `"Street HouseNo, PostalCode City"`) is parsed into the required structured fields (`country`, `street`, `postalCode`, `city`) at submission time.

### Units of measure (`GoodsMeasureType`)

Simplified declarations are submitted with activity type `DOMESTIC`, so the Domestic rules of the *EUDR Units of Measure Guidance* (V1.2.1) apply. Each commodity uses exactly one of the valid combinations:

| Commodity | Sent | Combination |
|-----------|------|-------------|
| Sojabohnen | `netWeight` (t × 1000 → kg) + `percentageEstimationOrDeviation` = `25` | Net mass with percentage estimate or deviation |
| Holz | `supplementaryUnit` + `MTQ` (m³) | Supplementary unit type and quantity |
| Rinder | `supplementaryUnit` + `NAR` (head count) | Supplementary unit type and quantity |

`percentageEstimationOrDeviation` is mandatory for `DOMESTIC` whenever `netWeight` is sent (allowed range 0–25), and must not be sent without `netWeight`. The maximum of 25 % is used because soy quantities are often yield-based estimates; the help text next to the quantity field tells users about this tolerance.

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

### Update types and auto-imports

When adding files during development, run

    npm install

to trigger type generation and make them available for auto-import.

## Production

Build the application for production:

    npm run build

Locally preview production build:

    npm run preview

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
