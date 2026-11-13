import { handlePaymentEndpoint } from '../_lib/paymentHandler.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  await handlePaymentEndpoint(req, res, '/api/webhooks/sikatpay');
}
