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

/**
 * Minimal, luxury Parisian letterpress stationery header lockup for HTML emails.
 * Works cleanly across Gmail, Apple Mail, and Outlook without CSS bullseye clutter.
 */
function buildEmailBotanicalCrestHtml(subtitleText = '') {
  const logoSvg = buildEmailBotanicalLogoSvg();
  return `
    <div style="text-align:center;margin:0 auto;">
      <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
        ${logoSvg}
      </div>
      <div style="display:inline-block;width:32px;height:32px;line-height:32px;border-radius:999px;background-color:#FDF4F6;border:1px dashed #D8A7B3;color:#9E4757;font-size:15px;text-align:center;margin-bottom:8px;">
        &#10047;
      </div>
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
      <div style="width:56px;margin:14px auto 0 auto;border-bottom:1px dashed #DFCEC0;"></div>
    </div>
  `.trim();
}

function buildEmailWaxSealHtml() {
  return `
    <span style="display:inline-block;width:22px;height:22px;line-height:22px;border-radius:999px;background-color:#9E4757;color:#FFFDF9;font-size:10px;text-align:center;font-family:Georgia,serif;vertical-align:middle;">
      &#9829;
    </span>
  `.trim();
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
  const crestHtml = buildEmailBotanicalCrestHtml(topicLabel);
  const noteBodyHtml = buildLetterpressNoteBodyHtml(message);
  const waxSealHtml = buildEmailWaxSealHtml();

  const html = `
    <div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;background-color:#FAF6F0;padding:40px 16px;color:#2A201D;">
      <div style="max-width:480px;margin:0 auto;background-color:#FFFDF9;border:1px solid #E6D7C8;border-radius:22px;padding:10px;box-shadow:0 12px 32px rgba(42,32,29,0.05);">
        <div style="background-color:#FFFDF9;border:1px dashed #DECBB9;border-radius:16px;padding:34px 30px 28px 30px;">
          ${crestHtml}

          <div style="text-align:center;margin:22px 0 18px 0;">
            <div style="font-size:15px;font-style:italic;color:#7D6B60;">
              From ${escapeHtml(displaySender)}
            </div>
            <div style="font-size:28px;font-weight:600;color:#2A201D;line-height:1.2;margin-top:4px;">
              Dear Studio,
            </div>
          </div>

          <div style="background-color:#FAF4EE;border:1px dashed #DECBB9;border-radius:14px;padding:20px 22px;margin:0 0 22px 0;">
            ${noteBodyHtml}
          </div>

          <div style="border-top:1px dashed #EADFD4;padding-top:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#6E5D54;line-height:1.7;">
            <div><span style="font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:14px;color:#2A201D;">From —</span> ${escapeHtml(displaySender)}</div>
            <div><span style="font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:14px;color:#2A201D;">Reply to —</span> ${replyToEmail ? `<a href="mailto:${escapeHtml(replyToEmail)}" style="color:#6E4434;text-decoration:underline;">${escapeHtml(replyToEmail)}</a>` : 'Not provided'}</div>
            <div style="font-size:11px;color:#9A877B;margin-top:6px;">
              ${waxSealHtml} <span style="vertical-align:middle;margin-left:6px;">Ref: ${escapeHtml(messageId)} · ${escapeHtml(createdAt)}</span>
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
  const crestHtml = buildEmailBotanicalCrestHtml('Handcrafted Digital Floral Studio');
  const noteBodyHtml = buildLetterpressNoteBodyHtml(message);
  const waxSealHtml = buildEmailWaxSealHtml();

  const html = `
    <div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;background-color:#FAF6F0;padding:40px 16px;color:#2A201D;">
      <div style="max-width:480px;margin:0 auto;background-color:#FFFDF9;border:1px solid #E6D7C8;border-radius:22px;padding:10px;box-shadow:0 12px 32px rgba(42,32,29,0.05);">
        <div style="background-color:#FFFDF9;border:1px dashed #DECBB9;border-radius:16px;padding:34px 30px 28px 30px;">
          ${crestHtml}

          <div style="text-align:center;margin:22px 0 14px 0;">
            <div style="font-size:28px;font-weight:600;font-style:italic;color:#2A201D;line-height:1.2;">
              ${greeting}
            </div>
          </div>

          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13.5px;line-height:1.75;color:#6E5D54;text-align:center;margin:0 0 20px 0;">
            Thank you for writing to Send A Bouquet. Your note has been safely received, and I’ll read it soon. Here is a keepsake copy of what you wrote:
          </p>

          <div style="background-color:#FAF4EE;border:1px dashed #DECBB9;border-radius:14px;padding:18px 22px;margin:0 0 22px 0;">
            <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:13.5px;font-style:italic;color:#8C7A70;margin-bottom:8px;padding-bottom:6px;border-bottom:1px dashed #E6D7C8;">
              Topic — ${escapeHtml(topicLabel)}
            </div>
            ${noteBodyHtml}
          </div>

          <div style="border-top:1px dashed #EADFD4;padding-top:16px;text-align:center;">
            <div style="font-size:15.5px;font-style:italic;color:#6E5D54;line-height:1.6;">
              Warmly,<br/>
              <strong style="color:#2A201D;font-style:normal;">Send A Bouquet</strong> · <a href="mailto:hello@sendabouquet.online" style="color:#6E4434;text-decoration:underline;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;font-style:normal;">hello@sendabouquet.online</a>
            </div>
            <div style="margin-top:10px;">
              ${waxSealHtml}
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
 * Builds the Surprise Bouquet Delivery Email for a loved one.
 * Keeps the sender UNNAMED so the identity remains a surprise until they unwrap the bouquet!
 */
export function buildBouquetSurpriseEmail({
  recipientName = '',
  giftUrl,
  hasVoiceNote = false,
  hasPhotoCard = false,
  isLocked = false,
}) {
  const cleanRecipient = String(recipientName || '').trim();
  const subject = cleanRecipient
    ? `For ${cleanRecipient} — Someone sent you a Bouquet`
    : 'Someone sent you a Bouquet';

  const crestHtml = buildEmailBotanicalCrestHtml('A Surprise Floral Delivery');
  const waxSealHtml = buildEmailWaxSealHtml();

  const keepsakeItems = ['Floral arrangement', 'Personal note'];
  if (hasPhotoCard) keepsakeItems.push('Photo keepsake');
  if (hasVoiceNote) keepsakeItems.push('Voice keepsake');
  if (isLocked) keepsakeItems.push('Secret lock reveal');

  const html = `
    <div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;background-color:#FAF6F0;padding:40px 16px;color:#2A201D;">
      <div style="max-width:480px;margin:0 auto;background-color:#FFFDF9;border:1px solid #E6D7C8;border-radius:22px;padding:10px;box-shadow:0 12px 32px rgba(42,32,29,0.05);">
        <div style="background-color:#FFFDF9;border:1px dashed #DECBB9;border-radius:16px;padding:36px 30px 28px 30px;text-align:center;">
          ${crestHtml}

          <div style="margin-top:24px;font-size:19px;font-style:italic;color:#7D6B60;">
            For ${escapeHtml(cleanRecipient || 'You')},
          </div>
          <div style="font-size:32px;font-weight:600;color:#2A201D;line-height:1.15;letter-spacing:-0.01em;margin:6px 0 20px 0;">
            Someone sent you a Bouquet
          </div>

          <div style="background-color:#FAF4EE;border:1px dashed #DECBB9;border-radius:14px;padding:22px 24px;margin:0 auto 24px auto;text-align:center;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.75;color:#5C4B43;">
              Someone special has arranged and sealed a digital bouquet just for you. Their name and personal note are tucked inside the flowers—waiting for you to untie the ribbon and watch each stem bloom on your screen.
            </p>
            <div style="width:64px;margin:14px auto 12px auto;border-bottom:1px dashed #DFCEC0;"></div>
            <div style="font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:14px;color:#8C7A70;">
              ${escapeHtml(keepsakeItems.join(' · '))}
            </div>
          </div>

          <div style="text-align:center;margin:0 0 24px 0;">
            <a href="${escapeHtml(giftUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 34px;border-radius:999px;background-color:#6E4434;color:#FFFDF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13.5px;font-weight:500;letter-spacing:0.01em;text-decoration:none;box-shadow:0 6px 18px rgba(110,68,52,0.16);">
              Unwrap Your Bouquet &rarr;
            </a>
          </div>

          <div style="border-top:1px dashed #EADFD4;padding-top:16px;text-align:center;">
            <div style="margin-bottom:8px;">
              ${waxSealHtml}
            </div>
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11.5px;color:#9A877B;line-height:1.6;">
              Sealed with a secret note · <a href="${escapeHtml(giftUrl)}" style="color:#6E4434;text-decoration:underline;word-break:break-all;">${escapeHtml(giftUrl)}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `.trim();

  const text = [
    `For ${cleanRecipient || 'You'},`,
    'Someone sent you a Bouquet!',
    '',
    'Someone special has arranged and sealed a handcrafted digital bouquet just for you.',
    'Their name and personal note are tucked inside the arrangement, waiting for you to unwrap the ribbon and watch each flower bloom.',
    '',
    `Unwrap your bouquet here: ${giftUrl}`,
    '',
    '— Send A Bouquet (hello@sendabouquet.online)',
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
    hasVoiceNote,
    hasPhotoCard,
    isLocked,
  } = validated.value;

  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  const fromAddress =
    (process.env.CONTACT_FROM_EMAIL || '').trim() ||
    'Send A Bouquet <hello@sendabouquet.online>';

  const mail = buildBouquetSurpriseEmail({
    recipientName,
    giftUrl,
    hasVoiceNote,
    hasPhotoCard,
    isLocked,
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
