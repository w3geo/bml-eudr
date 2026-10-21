/**
 * @typedef {Object} SmsOptions
 * @property {string} to - Recipient phone number in international format, e.g. `+436601234567`.
 * @property {string} content - Message text. More than 160 characters are sent as multiple SMS.
 */

/**
 * Send a transactional SMS via the Brevo API.
 *
 * Configured from the private runtime config `brevo`, which is populated via the
 * NUXT_BREVO_* environment variables:
 *   NUXT_BREVO_API_KEY, NUXT_BREVO_SMS_SENDER
 *
 * @param {SmsOptions} options
 * @returns {Promise<{ messageId: number }>}
 */
export const sendSms = async ({ to, content }) => {
  const { apiKey, smsSender } = useRuntimeConfig().brevo;
  if (!apiKey) {
    throw new Error('Brevo API key not configured (NUXT_BREVO_API_KEY)');
  }

  const res = await fetch('https://api.brevo.com/v3/transactionalSMS/send', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({
      sender: smsSender,
      // Brevo expects the country code without leading `+`
      recipient: to.replace(/^\+/, ''),
      content,
      type: 'transactional',
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo SMS request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
};
