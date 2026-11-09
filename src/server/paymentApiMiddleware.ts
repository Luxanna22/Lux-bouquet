import type { IncomingMessage, ServerResponse } from 'node:http';
// @ts-expect-error Shared ESM handler used by both Vercel /api/* and Vite dev server
import { handlePaymentEndpoint, verifyPaymongoWebhookSignature } from '../../api/_lib/paymentHandler.js';

export { verifyPaymongoWebhookSignature };

export async function handlePaymentApiMiddleware(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  return handlePaymentEndpoint(req, res);
}
