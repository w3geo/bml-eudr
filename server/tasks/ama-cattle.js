import { inArray } from 'drizzle-orm';
import amaCattle from '../db/schema/ama_cattle';
import { request } from 'https';

export default defineTask({
  meta: {
    name: 'ama-cattle',
    description: 'Task for transmitting cattle data to AMA',
  },
  async run() {
    const doneSdIds = [];
    const base64 = btoa(`${process.env.AMA_CLIENT_ID}:${process.env.AMA_CLIENT_SECRET}`);
    const options = {
      method: 'PUT',
      hostname: 'restds.services.ama.at',
      path: process.env.AMA_CATTLE_PATH,
      port: 443,
      cert: process.env.AMA_CERT,
      key: process.env.AMA_KEY,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${base64}`,
        'x-xsrf-token': 'cmon-ama-you-really-should-not-require-this',
        'cookie': 'XSRF-TOKEN=cmon-ama-you-really-should-not-require-this',
      },
    };
    const queue = await useDb().select().from(amaCattle);
    /** @type {Map<string, import('~~/server/utils/soap-traces').StatementInfo>} */
    const sdInfos = new Map();
    // TRACES returns at most 100 statements per getSd call.
    for (let i = 0; i < queue.length; i += 100) {
      try {
        const { statements, error } = await retrieveSd(queue.slice(i, i + 100).map((e) => e.sdId));
        if (error) {
          console.error('AMA Rinder: retrieving statements from TRACES failed:', error);
        }
        for (const statement of statements ?? []) {
          sdInfos.set(statement.sdId, statement);
        }
      } catch (e) {
        // TRACES busy - the remaining entries will be picked up by the next run.
        console.error('AMA Rinder: retrieving statements from TRACES failed:', e);
      }
    }
    for (const entry of queue) {
      const dds = sdInfos.get(entry.sdId);
      if (!dds || !dds.referenceNumber) {
        continue;
      }
      try {
        await new Promise((resolve, reject) => {
          const requestBody = JSON.stringify(
            {
              betriebsstaettenNummer: entry.lfbis,
              referenzNummer: dds.referenceNumber,
              verifikationsNummer: dds.verificationNumber,
              stueckZahl: entry.count,
              datumVon: new Date(dds.date).toISOString(),
            },
            null,
            2,
          );
          const req = request(options, (res) => {
            /** @type {Array<Buffer>} */
            const chunks = [];
            res.on('data', function (d) {
              chunks.push(d);
            });
            res.on('end', () => {
              const responseBody = Buffer.concat(chunks).toString();
              if (res.statusCode !== 200) {
                console.error(`AMA Rinder request failed: ${requestBody}`);
                return reject(
                  new Error(`Request failed with status code ${res.statusCode}: ${responseBody}`),
                );
              }
              resolve(responseBody ?? JSON.parse(responseBody));
            });
          });
          req.on('error', reject);
          req.write(requestBody);
          req.end();
        });
        doneSdIds.push(entry.sdId);
      } catch (e) {
        console.error('AMA Rinder request error:', e);
      }
    }
    await useDb().delete(amaCattle).where(inArray(amaCattle.sdId, doneSdIds));
    return { result: 'Success' };
  },
});
