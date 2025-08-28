import { inArray } from 'drizzle-orm';
import amaCattle from '../db/schema/ama_cattle';
import { request } from 'https';

export default defineTask({
  meta: {
    name: 'ama-cattle',
    description: 'Task for transmitting cattle data to AMA',
  },
  async run() {
    const doneDdsIds = [];
    const base64 = btoa(`${process.env.AMA_CLIENT_ID}:${process.env.AMA_CLIENT_SECRET}`);
    const options = {
      method: 'PUT',
      hostname: 'restds.services.ama.at',
      path: '/api/webservices/v1/stage/entwaldungs-vo',
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
    for (const entry of queue) {
      const ddss = await retrieveDDS([entry.ddsId]);
      if (!ddss) {
        continue;
      }
      const dds = ddss[0];
      if (!dds || !dds.referenceNumber) {
        continue;
      }
      try {
        await new Promise((resolve, reject) => {
          const requestBody = JSON.stringify(
            {
              betriebsstatttenNummer: entry.userId,
              referenzNummer: dds.referenceNumber,
              verifikationsNummer: dds.verificationNumber,
              stueckZahl: entry.count,
              datumVon: dds.date.toISOString(),
            },
            null,
            2,
          );
          const req = request(
            {
              ...options,
              method: 'PUT',
              path: '/api/webservices/v1/stage/entwaldungs-vo',
              headers: {
                ...options.headers,
                'x-xsrf-token': 'cmon-ama-you-really-should-not-require-this',
                'cookie': 'XSRF-TOKEN=cmon-ama-you-really-should-not-require-this',
              },
            },
            (res) => {
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
            },
          );
          req.write(requestBody);
          req.end();
        });
        doneDdsIds.push(entry.ddsId);
      } catch (e) {
        console.error('AMA Rinder request error:', e);
      }
    }
    await useDb().delete(amaCattle).where(inArray(amaCattle.ddsId, doneDdsIds));
    return { result: 'Success' };
  },
});
