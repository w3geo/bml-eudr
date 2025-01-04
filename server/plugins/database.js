import { createDatabase } from 'db0';
import postgresqlConnector from 'db0/connectors/postgresql';

export default defineNitroPlugin(() => {
  const database = useDatabase();
  if (database.dialect === 'postgresql' && process.env.DATABASE_URL) {
    // Replace the database connection with a runtime-configured one
    const postgresUrl = new URL(process.env.DATABASE_URL);
    const runtimeConfiguredDatabase = createDatabase(
      postgresqlConnector({
        user: postgresUrl.username,
        password: postgresUrl.password,
        host: postgresUrl.hostname,
        port: Number(postgresUrl.port),
        database: postgresUrl.pathname.slice(1),
        ssl: {
          rejectUnauthorized: false,
          ca: process.env.DATABASE_CA_CERT,
        },
      }),
    );
    Object.assign(database, {
      exec: runtimeConfiguredDatabase.exec,
      prepare: runtimeConfiguredDatabase.prepare,
      sql: runtimeConfiguredDatabase.sql,
    });
  }
});
