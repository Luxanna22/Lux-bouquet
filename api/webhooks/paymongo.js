import { handlePaymentEndpoint } from '../_lib/paymentHandler.js';

export default async function handler(req, res) {
  await handlePaymentEndpoint(req, res, '/api/webhooks/paymongo');
}
