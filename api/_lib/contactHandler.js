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

export function validateBouquetEmailPayload(raw = {}) {
  const recipientEmail = typeof raw.recipientEmail === 'string' ? raw.recipientEmail.trim().slice(0, 120) : '';
  const recipientName = typeof raw.recipientName === 'string' ? raw.recipientName.trim().slice(0, 60) : '';
  const giftUrl = typeof raw.giftUrl === 'string' ? raw.giftUrl.trim().slice(0, 2000) : '';
  const hasVoiceNote = Boolean(raw.hasVoiceNote);
  const hasPhotoCard = Boolean(raw.hasPhotoCard);
  const isLocked = Boolean(raw.isLocked);

  if (!recipientEmail || !EMAIL_REGEX.test(recipientEmail)) {
    return {
      ok: false,
      error: "Please enter a valid email address for your loved one.",
    };
  }

  if (!giftUrl || !/^https?:\/\//i.test(giftUrl)) {
    return {
      ok: false,
      error: 'Please seal your bouquet first so a valid gift link is ready to send.',
    };
  }

  return {
    ok: true,
    value: {
      recipientEmail,
      recipientName,
      giftUrl,
      hasVoiceNote,
      hasPhotoCard,
      isLocked,
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

export function buildEmailBotanicalLogoSvg() {
  const outerAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  const midAngles = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
  const innerAngles = [0, 60, 120, 180, 240, 300];
  const stamenAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  const outerPetals = outerAngles
    .map(
      (a) =>
        `<g transform="rotate(${a})"><path d="M 0,0 C -38,-34 -52,-98 0,-126 C 52,-98 38,-34 0,0 Z" fill="rgba(252,228,236,0.72)" stroke="#CD7E95" stroke-width="1.8"/><path d="M 0,-14 Q -12,-62 -6,-106 M 0,-18 Q 12,-62 6,-106 M 0,-10 L 0,-114" fill="none" stroke="#C67B91" stroke-width="0.95" stroke-linecap="round" stroke-opacity="0.48"/></g>`
    )
    .join('');

  const midPetals = midAngles
    .map(
      (a) =>
        `<g transform="rotate(${a})"><path d="M 0,0 C -28,-26 -38,-74 0,-94 C 38,-74 28,-26 0,0 Z" fill="rgba(255,240,230,0.76)" stroke="#C88A74" stroke-width="1.65"/><path d="M 0,-12 Q -8,-48 -3,-78 M 0,-12 Q 8,-48 3,-78" fill="none" stroke="#B87B65" stroke-width="0.9" stroke-linecap="round" stroke-opacity="0.44"/></g>`
    )
    .join('');

  const innerPetals = innerAngles
    .map(
      (a) =>
        `<path transform="rotate(${a})" d="M 0,0 C -18,-16 -22,-46 0,-58 C 22,-46 18,-16 0,0 Z" fill="rgba(252,220,232,0.82)" stroke="#C4748B" stroke-width="1.55"/>`
    )
    .join('');

  const stamens = stamenAngles
    .map(
      (d) =>
        `<g transform="rotate(${d})"><line x1="0" y1="-4" x2="0" y2="-20" stroke="#D97706" stroke-width="1.35" stroke-linecap="round"/><circle cx="0" cy="-21.5" r="2.2" fill="#F59E0B"/></g>`
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="26 28 468 284" width="124" height="76" style="display:block;margin:0 auto;">
    <g transform="translate(260, 170)">
      <path d="M -55,10 C -115,-28 -175,-18 -212,18 C -170,48 -110,44 -55,10 Z" fill="rgba(226,242,232,0.76)" stroke="#7AA387" stroke-width="1.8"/>
      <path d="M -60,10 Q -135,4 -198,17 M -115,7 L -138,-6 M -145,10 L -168,0 M -125,11 L -148,24" fill="none" stroke="#6A9478" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M -75,-18 C -128,-58 -168,-54 -194,-32" fill="none" stroke="#C28C7A" stroke-width="1.5" stroke-dasharray="4 4" stroke-linecap="round"/>
      <path d="M -194,-32 C -210,-46 -222,-32 -206,-22 C -196,-16 -190,-24 -194,-32 Z" fill="rgba(252,228,236,0.85)" stroke="#C97A90" stroke-width="1.6"/>
      <path d="M 55,10 C 115,-28 175,-18 212,18 C 170,48 110,44 55,10 Z" fill="rgba(226,242,232,0.76)" stroke="#7AA387" stroke-width="1.8"/>
      <path d="M 60,10 Q 135,4 198,17 M 115,7 L 138,-6 M 145,10 L 168,0 M 125,11 L 148,24" fill="none" stroke="#6A9478" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M 75,-18 C 128,-58 168,-54 194,-32" fill="none" stroke="#C28C7A" stroke-width="1.5" stroke-dasharray="4 4" stroke-linecap="round"/>
      <path d="M 194,-32 C 210,-46 222,-32 206,-22 C 196,-16 190,-24 194,-32 Z" fill="rgba(252,228,236,0.85)" stroke="#C97A90" stroke-width="1.6"/>
      ${outerPetals}
      ${midPetals}
      ${innerPetals}
      <circle cx="0" cy="0" r="22" fill="rgba(253,230,138,0.45)"/>
      ${stamens}
      <circle cx="0" cy="0" r="6.8" fill="#FEF3C7" stroke="#D97706" stroke-width="1.6"/>
    </g>
  </svg>`;
}

function resolveEmailAssetOrigin(candidateUrl = '') {
  try {
    if (candidateUrl && /^https?:\/\//i.test(candidateUrl)) {
      const parsed = new URL(candidateUrl);
      if (parsed.origin && !parsed.hostname.includes('localhost')) {
        return parsed.origin;
      }
    }
  } catch {
    // Fall back to canonical production origin
  }
  return 'https://www.sendabouquet.online';
}

/**
 * Minimal, luxury Parisian letterpress stationery header lockup for HTML emails.
 * Renders the exact 100% Hero blooming flower with leaves, veins, buds, and dashed tendrils
 * via `/assets/hero-bloom-crest.png` with zero hidden SVG bloat or dingbat symbols.
 */
function buildEmailBotanicalCrestHtml(subtitleText = '', assetOrigin = 'https://www.sendabouquet.online') {
  const crestUrl = `${assetOrigin.replace(/\/$/, '')}/assets/hero-bloom-crest.png`;
  return `
    <div style="text-align:center;margin:0 auto;">
      <img src="${escapeHtml(crestUrl)}" width="148" height="87" alt="" style="display:block;margin:0 auto 4px auto;width:148px;height:87px;border:0;outline:none;text-decoration:none;" />
      <div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#2A201D;letter-spacing:0.01em;line-height:1.2;">
        Send A Bouquet
      </div>
      ${
        subtitleText
          ? `<div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-style:italic;font-size:13.5px;color:#8C7A70;margin-top:2px;">
              ${escapeHtml(subtitleText)}
            </div>`
          : ''
      }
      <div style="width:56px;margin:12px auto 0 auto;border-bottom:1px dashed #DFCEC0;"></div>
    </div>
  `.trim();
}

function buildEmailPreheaderHtml(previewText) {
  return `<div style="display:none;font-size:1px;color:#FAF6F0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(previewText)}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`;
}

/**
 * Formats user message paragraphs naturally inside a soft oatmeal vellum letterpress card
 * without artificial character-width line breaks that cause single-word orphan wrapping in Gmail.
 */
function buildLetterpressNoteBodyHtml(message) {
  const paragraphs = String(message || '')
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return `<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.75;color:#2A201D;">&nbsp;</p>`;
  }

  return paragraphs
    .map((para, idx) => {
      const safeLines = para
        .split(/\r?\n/)
        .map((line) => escapeHtml(line.trim()))
        .join('<br/>');
      const isLast = idx === paragraphs.length - 1;
      return `<p style="margin:0 0 ${isLast ? '0' : '12px'} 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.75;color:#2A201D;">${safeLines}</p>`;
    })
    .join('');
}

export function buildStudioNotificationEmail({ topicLabel, senderName, replyToEmail, message, createdAt, messageId }) {
  const displaySender = senderName || 'Anonymous Visitor';
  const subject = `[Send A Bouquet · ${topicLabel}] Note from ${displaySender}`;
  const preheaderHtml = buildEmailPreheaderHtml(`Note from ${displaySender} (${topicLabel}): ${String(message || '').slice(0, 90)}`);
  const crestHtml = buildEmailBotanicalCrestHtml(topicLabel);
  const noteBodyHtml = buildLetterpressNoteBodyHtml(message);

  const html = `
    <div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;background-color:#FAF6F0;padding:36px 16px;color:#2A201D;">
      ${preheaderHtml}
      <div style="max-width:480px;margin:0 auto;background-color:#FFFDF9;border:1px solid #E6D7C8;border-radius:22px;padding:10px;">
        <div style="background-color:#FFFDF9;border:1px dashed #DECBB9;border-radius:16px;padding:32px 28px 26px 28px;">
          ${crestHtml}

          <div style="text-align:center;margin:20px 0 16px 0;">
            <div style="font-size:15px;font-style:italic;color:#7D6B60;">
              From ${escapeHtml(displaySender)}
            </div>
            <div style="font-size:28px;font-weight:600;color:#2A201D;line-height:1.2;margin-top:4px;">
              Dear Studio,
            </div>
          </div>

          <div style="background-color:#FAF4EE;border:1px dashed #DECBB9;border-radius:14px;padding:20px 22px;margin:0 0 20px 0;">
            ${noteBodyHtml}
          </div>

          <div style="border-top:1px dashed #EADFD4;padding-top:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#6E5D54;line-height:1.7;">
            <div><span style="font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:14px;color:#2A201D;">From —</span> ${escapeHtml(displaySender)}</div>
            <div><span style="font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:14px;color:#2A201D;">Reply to —</span> ${replyToEmail ? `<a href="mailto:${escapeHtml(replyToEmail)}" style="color:#6E4434;text-decoration:underline;">${escapeHtml(replyToEmail)}</a>` : 'Not provided'}</div>
            <div style="font-size:11px;color:#9A877B;margin-top:4px;">
              Ref: ${escapeHtml(messageId)} · ${escapeHtml(createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `.trim();

  const text = [
    `Send A Bouquet — ${topicLabel}`,
    `From: ${displaySender}`,
    `Reply to: ${replyToEmail || 'Not provided'}`,
    `Reference: ${messageId} (${createdAt})`,
    '',
    message,
  ].join('\n');

  return { subject, html, text };
}

export function buildVisitorConfirmationEmail({ topicLabel, senderName, message }) {
  const greeting = senderName ? `Dear ${escapeHtml(senderName)},` : 'Dear Friend,';
  const subject = `Your note to Send A Bouquet (${topicLabel})`;
  const preheaderHtml = buildEmailPreheaderHtml(`${senderName ? `Dear ${senderName}, thank` : 'Thank'} you for writing to Send A Bouquet. Your note has been received.`);
  const crestHtml = buildEmailBotanicalCrestHtml('');
  const noteBodyHtml = buildLetterpressNoteBodyHtml(message);

  const html = `
    <div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;background-color:#FAF6F0;padding:36px 16px;color:#2A201D;">
      ${preheaderHtml}
      <div style="max-width:480px;margin:0 auto;background-color:#FFFDF9;border:1px solid #E6D7C8;border-radius:22px;padding:10px;">
        <div style="background-color:#FFFDF9;border:1px dashed #DECBB9;border-radius:16px;padding:32px 28px 26px 28px;">
          ${crestHtml}

          <div style="text-align:center;margin:20px 0 12px 0;">
            <div style="font-size:28px;font-weight:600;font-style:italic;color:#2A201D;line-height:1.2;">
              ${greeting}
            </div>
          </div>

          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13.5px;line-height:1.75;color:#6E5D54;text-align:center;margin:0 0 18px 0;">
            Thank you for writing to Send A Bouquet. Your note has been safely received, and I’ll read it soon. Here is a keepsake copy of what you wrote:
          </p>

          <div style="background-color:#FAF4EE;border:1px dashed #DECBB9;border-radius:14px;padding:18px 22px;margin:0 0 20px 0;">
            <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:13.5px;font-style:italic;color:#8C7A70;margin-bottom:8px;padding-bottom:6px;border-bottom:1px dashed #E6D7C8;">
              Topic — ${escapeHtml(topicLabel)}
            </div>
            ${noteBodyHtml}
          </div>

          <div style="border-top:1px dashed #EADFD4;padding-top:14px;text-align:center;">
            <div style="font-size:15.5px;font-style:italic;color:#6E5D54;line-height:1.6;">
              Warmly,<br/>
              <strong style="color:#2A201D;font-style:normal;">Send A Bouquet</strong> · <a href="mailto:hello@sendabouquet.online" style="color:#6E4434;text-decoration:underline;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;font-style:normal;">hello@sendabouquet.online</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `.trim();

  const text = [
    senderName ? `Dear ${senderName},` : 'Dear Friend,',
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

/**
 * Resolves the sender identity for surprise bouquet deliveries.
 * Configurable via BOUQUET_FROM_EMAIL; defaults to a dedicated local-part on the verified domain
 * without fake persona names.
 */
export function resolveBouquetFromAddress(env = process.env) {
  return (
    String(env?.BOUQUET_FROM_EMAIL || '').trim() ||
    'Send A Bouquet <deliveries@sendabouquet.online>'
  );
}

/**
 * Builds the Surprise Bouquet Delivery Email for a loved one.
 * Keeps the sender UNNAMED and omits keepsake details so everything remains a surprise inside the web app.
 * Uses an ultra-clean, imageless, left-aligned plain-text feel with strictly greeting + one short sentence + inline URL
 * for highest Primary inbox placement in Gmail.
 */
export function buildBouquetSurpriseEmail({
  recipientName = '',
  giftUrl,
}) {
  const cleanRecipient = String(recipientName || '').trim();
  const displayRecipient = cleanRecipient || 'You';
  const subject = cleanRecipient
    ? `For ${cleanRecipient} — someone sent you a bouquet`
    : 'Someone sent you a bouquet';

  const introSentence =
    'Someone arranged a digital bouquet and tucked a personal note inside for you to open whenever you are ready.';

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#222222;max-width:560px;margin:0;padding:0;text-align:left;"><p style="margin:0 0 14px 0;">For ${escapeHtml(displayRecipient)},</p><p style="margin:0 0 14px 0;">${introSentence}</p><p style="margin:0;"><a href="${escapeHtml(giftUrl)}" target="_blank" rel="noopener noreferrer" style="color:#6E4434;text-decoration:underline;word-break:break-all;">${escapeHtml(giftUrl)}</a></p></div>`;

  const text = [
    `For ${displayRecipient},`,
    '',
    introSentence,
    '',
    giftUrl,
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

export async function processBouquetEmailDelivery(rawBody = {}) {
  const validated = validateBouquetEmailPayload(rawBody);
  if (!validated.ok) {
    return {
      statusCode: 400,
      body: { ok: false, error: validated.error },
    };
  }

  const {
    recipientEmail,
    recipientName,
    giftUrl,
  } = validated.value;

  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  const fromAddress = resolveBouquetFromAddress();

  const mail = buildBouquetSurpriseEmail({
    recipientName,
    giftUrl,
  });

  let emailDispatched = false;
  if (resendApiKey) {
    emailDispatched = await sendResendEmail(resendApiKey, {
      from: fromAddress,
      to: [recipientEmail],
      reply_to: 'hello@sendabouquet.online',
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  }

  return {
    statusCode: 200,
    body: {
      ok: true,
      recipientEmail,
      recipientName: recipientName || null,
      subject: mail.subject,
      emailDispatched,
      createdAt: new Date().toISOString(),
    },
  };
}
