const FIRESTORE_PROJECT_ID = 'amiable-alloy-sw1sf';
const FIRESTORE_DB_ID = 'ai-studio-luxbouquet-d9f38715-de7a-49d9-bccf-4493a2abc586';
const FIRESTORE_CONTACT_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/contact_messages`;

export const VALID_TOPICS = {
  flower_wish: 'Flower Wish',
  feedback: 'Feedback',
  order_help: 'Order Help',
  general: 'General Note',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function generateContactMessageId(nowMs = Date.now()) {
  const randomSuffix = Math.random().toString(36).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'note1234';
  return `msg_${nowMs}_${randomSuffix.padEnd(6, '0')}`;
}

export function validateContactPayload(raw = {}) {
  const rawTopic = typeof raw.topic === 'string' ? raw.topic.trim() : 'general';
  const topic = Object.prototype.hasOwnProperty.call(VALID_TOPICS, rawTopic) ? rawTopic : 'general';
  const topicLabel = VALID_TOPICS[topic];

  const senderName = typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : '';
  const replyToEmail = typeof raw.replyToEmail === 'string' ? raw.replyToEmail.trim().slice(0, 120) : '';
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';

  if (!message || message.length < 3) {
    return {
      ok: false,
      error: 'Please write a brief note before sealing and sending.',
    };
  }

  if (message.length > 2000) {
    return {
      ok: false,
      error: 'Your note is a little too long (maximum 2,000 characters).',
    };
  }

  if (replyToEmail && !EMAIL_REGEX.test(replyToEmail)) {
    return {
      ok: false,
      error: 'Please enter a valid reply-to email address, or leave it blank.',
    };
  }

  if (topic === 'order_help' && !replyToEmail) {
    return {
      ok: false,
      error: 'Please include your email address in "Reply to" so I can help with your order.',
    };
  }

  return {
    ok: true,
    value: {
      topic,
      topicLabel,
      senderName,
      replyToEmail,
      message,
    },
  };
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildStudioNotificationEmail({ topicLabel, senderName, replyToEmail, message, createdAt, messageId }) {
  const displaySender = senderName || 'Anonymous Visitor';
  const safeMessageHtml = escapeHtml(message).replace(/\n/g, '<br/>');
  const subject = `[Send A Bouquet • ${topicLabel}] Note from ${displaySender}`;

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; background-color: #FDF9F5; padding: 28px 18px; color: #231C18;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #FFFDF9; border: 1px dashed #D8C3B0; border-radius: 20px; padding: 28px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #7A4B3A; margin-bottom: 6px;">
          Send A Bouquet • ${escapeHtml(topicLabel)}
        </div>
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #1F1815;">
          Dear Studio,
        </h2>
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.7; color: #231C18; padding: 14px 16px; background-color: #FAF5EF; border-radius: 12px; border: 1px dashed #E2D3C4;">
          ${safeMessageHtml}
        </div>
        <div style="margin-top: 20px; padding-top: 14px; border-top: 1px dashed #E2D3C4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #6E5D54; line-height: 1.6;">
          <div><strong>From:</strong> ${escapeHtml(displaySender)}</div>
          <div><strong>Reply-To:</strong> ${replyToEmail ? `<a href="mailto:${escapeHtml(replyToEmail)}" style="color: #7A4B3A;">${escapeHtml(replyToEmail)}</a>` : 'Not provided'}</div>
          <div><strong>Topic:</strong> ${escapeHtml(topicLabel)}</div>
          <div><strong>Reference:</strong> ${escapeHtml(messageId)} (${escapeHtml(createdAt)})</div>
        </div>
      </div>
    </div>
  `.trim();

  const text = [
    `Send A Bouquet — ${topicLabel}`,
    `From: ${displaySender}`,
    `Reply-To: ${replyToEmail || 'Not provided'}`,
    `Reference: ${messageId} (${createdAt})`,
    '',
    message,
  ].join('\n');

  return { subject, html, text };
}

export function buildVisitorConfirmationEmail({ topicLabel, senderName, message }) {
  const greeting = senderName ? `Dear ${escapeHtml(senderName)},` : 'Hello,';
  const safeMessageHtml = escapeHtml(message).replace(/\n/g, '<br/>');
  const subject = `Your note to Send A Bouquet (${topicLabel})`;

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; background-color: #FDF9F5; padding: 28px 18px; color: #231C18;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #FFFDF9; border: 1px dashed #D8C3B0; border-radius: 20px; padding: 28px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #7A4B3A; margin-bottom: 6px;">
          Send A Bouquet • Note Received
        </div>
        <h2 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600; color: #1F1815;">
          ${greeting}
        </h2>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.65; color: #5C4438; margin: 0 0 16px 0;">
          Thank you for writing to Send A Bouquet. Your note under <strong>${escapeHtml(topicLabel)}</strong> has been safely received, and I’ll read it soon. If you ever need to add anything else, you can simply reply to this email.
        </p>
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.65; color: #231C18; padding: 14px 16px; background-color: #FAF5EF; border-radius: 12px; border: 1px dashed #E2D3C4;">
          <div style="font-size: 11px; color: #8C766C; margin-bottom: 6px;">A copy of your note:</div>
          ${safeMessageHtml}
        </div>
        <p style="margin: 20px 0 0 0; font-size: 14px; font-style: italic; color: #6E5D54;">
          Warmly,<br/>
          Send A Bouquet (<a href="mailto:hello@sendabouquet.online" style="color: #7A4B3A; text-decoration: none;">hello@sendabouquet.online</a>)
        </p>
      </div>
    </div>
  `.trim();

  const text = [
    senderName ? `Dear ${senderName},` : 'Hello,',
    '',
    `Thank you for writing to Send A Bouquet. Your note (${topicLabel}) has been safely received, and I'll read it soon.`,
    '',
    '--- Your note ---',
    message,
    '',
    'Warmly,',
    'Send A Bouquet (hello@sendabouquet.online)',
  ].join('\n');

  return { subject, html, text };
}

async function sendResendEmail(apiKey, payload) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return resp.ok;
  } catch {
    return false;
  }
}

async function saveContactToFirestoreRest(docData) {
  try {
    const fields = {
      messageId: { stringValue: docData.messageId },
      topic: { stringValue: docData.topic },
      topicLabel: { stringValue: docData.topicLabel },
      senderName: { stringValue: docData.senderName },
      replyToEmail: { stringValue: docData.replyToEmail },
      message: { stringValue: docData.message },
      emailDispatched: { booleanValue: Boolean(docData.emailDispatched) },
      autoReplySent: { booleanValue: Boolean(docData.autoReplySent) },
      createdAt: { stringValue: docData.createdAt },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(
      `${FIRESTORE_CONTACT_URL}?documentId=${encodeURIComponent(docData.messageId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    return resp.ok;
  } catch {
    return false;
  }
}

export async function processContactSubmission(rawBody = {}) {
  const validated = validateContactPayload(rawBody);
  if (!validated.ok) {
    return {
      statusCode: 400,
      body: { ok: false, error: validated.error },
    };
  }

  const { topic, topicLabel, senderName, replyToEmail, message } = validated.value;
  const messageId = generateContactMessageId();
  const createdAt = new Date().toISOString();

  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  const fromAddress =
    (process.env.CONTACT_FROM_EMAIL || '').trim() ||
    'Send A Bouquet <hello@sendabouquet.online>';
  const toAddress =
    (process.env.CONTACT_TO_EMAIL || '').trim() || 'luxcg22@gmail.com';

  let emailDispatched = false;
  let autoReplySent = false;

  if (resendApiKey) {
    const studioMail = buildStudioNotificationEmail({
      topicLabel,
      senderName,
      replyToEmail,
      message,
      createdAt,
      messageId,
    });

    const studioPayload = {
      from: fromAddress,
      to: [toAddress],
      subject: studioMail.subject,
      html: studioMail.html,
      text: studioMail.text,
    };
    if (replyToEmail) {
      studioPayload.reply_to = replyToEmail;
    }

    emailDispatched = await sendResendEmail(resendApiKey, studioPayload);

    if (replyToEmail) {
      const visitorMail = buildVisitorConfirmationEmail({
        topicLabel,
        senderName,
        message,
      });
      autoReplySent = await sendResendEmail(resendApiKey, {
        from: fromAddress,
        to: [replyToEmail],
        reply_to: 'hello@sendabouquet.online',
        subject: visitorMail.subject,
        html: visitorMail.html,
        text: visitorMail.text,
      });
    }
  }

  const savedToFirestore = await saveContactToFirestoreRest({
    messageId,
    topic,
    topicLabel,
    senderName,
    replyToEmail,
    message,
    emailDispatched,
    autoReplySent,
    createdAt,
  });

  return {
    statusCode: 200,
    body: {
      ok: true,
      messageId,
      topic,
      topicLabel,
      emailDispatched,
      autoReplySent,
      savedToFirestore,
      confirmationRecipient: replyToEmail || null,
      createdAt,
    },
  };
}
