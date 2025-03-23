import { DOMParser } from 'xmldom';
import users from '../db/schema/users';
import { eq } from 'drizzle-orm';
import statements from '../db/schema/statements';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  const userId = (await requireUserSession(event)).user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }
  const db = useDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const internalReference = randomUUID();

  /** @type {{commodities: Object<string, import('~/pages/statement.vue').CommodityData}} */
  const statement = await readBody(event);
  const commodities = statement.commodities;
  const submitXML = getSubmitXML(commodities, user, internalReference);
  const submitResponse = await fetch(
    'https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRSubmissionServiceV1',
    {
      method: 'POST',
      body: submitXML,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'http://ec.europa.eu/tracesnt/certificate/eudr/submission/submitDds',
      },
    },
  );
  const submitResponseXML = await submitResponse.text();
  const xml = new DOMParser().parseFromString(submitResponseXML);
  const errors = xml.getElementsByTagNameNS(
    'http://ec.europa.eu/sanco/tracesnt/error/v01',
    'Error',
  );
  if (errors.length > 0) {
    const message =
      errors[0].getElementsByTagNameNS('http://ec.europa.eu/sanco/tracesnt/error/v01', 'Message')[0]
        .textContent || 'Unknown error';
    throw createError({ status: 400, statusMessage: 'Bad Request', message });
  }
  const identifier = xml.getElementsByTagNameNS(
    'http://ec.europa.eu/tracesnt/certificate/eudr/submission/v1',
    'ddsIdentifier',
  )[0].textContent;
  if (!identifier) {
    throw createError({
      status: 500,
      statusMessage: 'Internal Server Error',
      message: 'No identifier returned',
    });
  }

  await db.insert(statements).values({
    id: internalReference,
    userId,
    statement,
    created: new Date(),
  });

  appendHeader(event, 'Location', `/api/statements/${internalReference}`);
  return sendNoContent(event, 201);

  // const retrieveXML = getRetrieveXML(identifier);
  // const retrieveResponse = await fetch(
  //   'https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRRetrievalServiceV1',
  //   {
  //     method: 'POST',
  //     body: retrieveXML,
  //     headers: {
  //       'Content-Type': 'text/xml; charset=utf-8',
  //       SOAPAction: 'http://ec.europa.eu/tracesnt/certificate/eudr/retrieval/getDdsInfo',
  //     },
  //   },
  // );
  // const retrieveResponseXML = await retrieveResponse.text();
  // const xml = new DOMParser().parseFromString(retrieveResponseXML);
  // const referenceNumbers = xml.getElementsByTagNameNS(
  //   'http://ec.europa.eu/tracesnt/certificate/eudr/retrieval/v1',
  //   'referenceNumber',
  // );
  // if (referenceNumbers.length > 0) {
  //   const referenceNumber = referenceNumbers[0].textContent;
  //   const verificationNumber = xml.getElementsByTagNameNS(
  //     'http://ec.europa.eu/tracesnt/certificate/eudr/retrieval/v1',
  //     'verificationNumber',
  //   )[0].textContent;
  //   return { referenceNumber, verificationNumber };
  //}
});
