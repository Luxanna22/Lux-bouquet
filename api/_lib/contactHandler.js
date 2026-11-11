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
 * Builds an email-safe CSS/HTML Scalloped Eyelet Lace strip + Botanical Crest & Perforated Postage Stamp
 * so Gmail and webmail clients (which strip <svg>) still render our botanical blossom crest,
 * sage leaves, dashed tendrils, eyelet lace, postage stamp, and ruled stationery lines.
 */
function buildEmailLaceStripHtml() {
  const eyelets = Array.from({ length: 15 })
    .map(
      () =>
        `<td align="center" style="padding: 0 3px;"><span style="display:inline-block;width:8px;height:8px;border-radius:999px;background-color:#FFFDF9;border:1px dashed #C9B29D;"></span></td>`
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1E4D5;border-bottom:1px dashed #CFB8A3;">
      <tr>
        <td align="center" style="padding: 7px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>${eyelets}</tr>
          </table>
        </td>
      </tr>
    </table>
  `.trim();
}

function buildEmailBotanicalCrestHtml() {
  const logoSvg = buildEmailBotanicalLogoSvg();
  return `
    <div style="text-align:center;margin:0 auto;">
      <!-- Inline SVG for Apple Mail & modern clients -->
      <div style="mso-hide:all;">
        ${logoSvg}
      </div>
      <!-- Email-safe CSS Drawn Botanical Blossom Crest for Gmail/Webmail (always visible) -->
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 2px auto 0 auto;">
        <tr>
          <!-- Left Arched Dashed Tendril & Blush Bud -->
          <td valign="middle" align="right" style="padding-right: 4px;">
            <span style="display:inline-block;width:11px;height:8px;border-radius:999px;background-color:#FCE2EC;border:1.5px solid #C97A90;vertical-align:middle;"></span><span style="display:inline-block;width:18px;border-top:1.5px dashed #C28C7A;vertical-align:middle;margin-left:2px;"></span>
          </td>
          <!-- Left Sage Leaf -->
          <td valign="middle" align="right">
            <div style="width:28px;height:14px;border-radius:16px 4px 16px 4px;background-color:#DCEFE2;border:1.5px solid #7AA387;"></div>
          </td>
          <!-- Center Multi-Layered Blush & Peach Blossom Medallion -->
          <td valign="middle" align="center" style="padding: 0 3px;">
            <div style="width:52px;height:52px;border-radius:999px;background-color:#FCE4EC;border:2px dashed #CD7E95;padding:5px;box-sizing:border-box;box-shadow:0 3px 10px rgba(201,122,144,0.16);">
              <div style="width:38px;height:38px;border-radius:999px;background-color:#FFF0E5;border:1.5px solid #C88A74;padding:6px;box-sizing:border-box;">
                <div style="width:22px;height:22px;border-radius:999px;background-color:#FCDCE8;border:1.5px solid #C4748B;padding:4px;box-sizing:border-box;">
                  <div style="width:10px;height:10px;border-radius:999px;background-color:#FEF3C7;border:1.5px solid #D97706;margin:0 auto;"></div>
                </div>
              </div>
            </div>
          </td>
          <!-- Right Sage Leaf -->
          <td valign="middle" align="left">
            <div style="width:28px;height:14px;border-radius:4px 16px 4px 16px;background-color:#DCEFE2;border:1.5px solid #7AA387;"></div>
          </td>
          <!-- Right Arched Dashed Tendril & Blush Bud -->
          <td valign="middle" align="left" style="padding-left: 4px;">
            <span style="display:inline-block;width:18px;border-top:1.5px dashed #C28C7A;vertical-align:middle;margin-right:2px;"></span><span style="display:inline-block;width:11px;height:8px;border-radius:999px;background-color:#FCE2EC;border:1.5px solid #C97A90;vertical-align:middle;"></span>
          </td>
        </tr>
      </table>
    </div>
  `.trim();
}

function buildEmailPostageStampHtml() {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right">
      <tr>
        <td valign="middle" style="padding-right: 6px;">
          <div style="width:36px;border-top:1px dashed #B8A090;margin-bottom:4px;"></div>
          <div style="width:42px;border-top:1px dashed #B8A090;margin-bottom:4px;"></div>
          <div style="width:36px;border-top:1px dashed #B8A090;"></div>
        </td>
        <td valign="middle">
          <div style="background-color:#F5E9DC;border:2px dashed #C2AA96;border-radius:6px;padding:4px;">
            <div style="background-color:#FFFDF9;border:1px solid #DFCFC0;border-radius:3px;width:36px;height:42px;text-align:center;padding-top:7px;box-sizing:border-box;">
              <div style="width:18px;height:18px;border-radius:999px;background-color:#FCE2EC;border:1.5px solid #C87A90;margin:0 auto;padding:4px;box-sizing:border-box;">
                <div style="width:6px;height:6px;border-radius:999px;background-color:#F59E0B;margin:0 auto;"></div>
              </div>
              <div style="width:18px;border-top:1px solid #C4AE9E;margin:6px auto 0 auto;"></div>
            </div>
          </div>
        </td>
      </tr>
    </table>
  `.trim();
}

function buildEmailWaxSealHtml() {
  return `
    <div style="display:inline-block;width:38px;height:38px;border-radius:999px;background-color:#F6E0E4;border:1.5px dashed #9E4757;padding:4px;box-sizing:border-box;text-align:center;vertical-align:middle;">
      <div style="width:26px;height:26px;border-radius:999px;background-color:#9E4757;color:#FFFDF9;font-size:12px;line-height:26px;text-align:center;font-family:Georgia,serif;">
        &#9829;
      </div>
    </div>
  `.trim();
}

/**
 * Renders message text across at least 4 visible dashed ruled stationery paper lines
 * so even short notes look like authentic lined letter paper.
 */
function buildRuledPaperLinesHtml(message) {
  const rawLines = String(message || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((_, idx, arr) => idx < 12 || arr.length <= 12);

  const lines = [];
  for (const part of rawLines) {
    if (!part) {
      lines.push('');
      continue;
    }
    if (part.length <= 68) {
      lines.push(part);
    } else {
      const words = part.split(/\s+/);
      let current = '';
      for (const word of words) {
        if ((current + ' ' + word).trim().length > 68 && current) {
          lines.push(current);
          current = word;
        } else {
          current = current ? `${current} ${word}` : word;
        }
      }
      if (current) lines.push(current);
    }
  }

  while (lines.length < 4) {
    lines.push('');
  }

  return lines
    .map(
      (lineText) => `
      <div style="min-height:32px;line-height:32px;border-bottom:1px dashed #DFCEC0;padding:0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#231C18;">
        ${lineText ? escapeHtml(lineText) : '&nbsp;'}
      </div>`
    )
    .join('');
}

export function buildStudioNotificationEmail({ topicLabel, senderName, replyToEmail, message, createdAt, messageId }) {
  const displaySender = senderName || 'Anonymous Visitor';
  const subject = `[Send A Bouquet · ${topicLabel}] Note from ${displaySender}`;
  const laceStrip = buildEmailLaceStripHtml();
  const crestHtml = buildEmailBotanicalCrestHtml();
  const stampHtml = buildEmailPostageStampHtml();
  const ruledPaperHtml = buildRuledPaperLinesHtml(message);
  const waxSealHtml = buildEmailWaxSealHtml();

  const html = `
    <div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;background-color:#EFE5D8;padding:32px 14px;color:#231C18;">
      <!-- Stacked Deckled Kraft Paper Backing -->
      <div style="max-width:560px;margin:0 auto;background-color:#E4D4C3;border:1px dashed #C4AC96;border-radius:26px;padding:6px 7px 10px 6px;">
        <!-- Primary Warm Cotton Parchment Stationery Sheet -->
        <div style="background-color:#FAF3E9;border:1.5px dashed #CEB7A2;border-radius:22px;overflow:hidden;box-shadow:0 12px 30px rgba(110,68,52,0.08);">
          ${laceStrip}

          <div style="padding:24px 24px 26px 24px;">
            <!-- Centered Botanical Blossom Crest & Title -->
            <div style="text-align:center;padding-bottom:16px;border-bottom:1px dashed #E2D1C1;">
              ${crestHtml}
              <div style="margin-top:8px;font-size:22px;font-weight:600;color:#231C18;letter-spacing:-0.01em;">
                Send A Bouquet
              </div>
              <div style="margin-top:4px;">
                <span style="display:inline-block;padding:3px 12px;border-radius:999px;background-color:#6E4434;color:#FFFDF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;font-weight:500;">
                  ${escapeHtml(topicLabel)}
                </span>
              </div>
            </div>

            <!-- Postcard Salutation Row + Perforated Floral Postage Stamp -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 10px 0;">
              <tr>
                <td valign="middle" align="left">
                  <div style="font-size:26px;font-weight:500;font-style:italic;color:#1F1815;">
                    Dear Studio,
                  </div>
                </td>
                <td valign="middle" align="right">
                  ${stampHtml}
                </td>
              </tr>
            </table>

            <!-- Tactile Ruled Paper Sheet -->
            <div style="background-color:#FFFDF9;border:1px dashed #DECBB9;border-radius:16px;padding:12px 18px 18px 18px;">
              ${ruledPaperHtml}
            </div>

            <!-- Bottom Postcard Signature & Crimson Wax Seal -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;padding-top:14px;border-top:1px dashed #DECBB9;">
              <tr>
                <td valign="middle" align="left" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12.5px;color:#6E5D54;line-height:1.7;">
                  <div><strong style="color:#231C18;font-family:Georgia,serif;font-style:italic;font-size:14px;">From:</strong> ${escapeHtml(displaySender)}</div>
                  <div><strong style="color:#231C18;font-family:Georgia,serif;font-style:italic;font-size:14px;">Reply to:</strong> ${replyToEmail ? `<a href="mailto:${escapeHtml(replyToEmail)}" style="color:#6E4434;text-decoration:underline;">${escapeHtml(replyToEmail)}</a>` : 'Not provided'}</div>
                  <div style="font-size:11px;color:#9A877B;margin-top:3px;">Ref: ${escapeHtml(messageId)} · ${escapeHtml(createdAt)}</div>
                </td>
                <td valign="middle" align="right" width="52">
                  ${waxSealHtml}
                </td>
              </tr>
            </table>
          </div>

          ${laceStrip}
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
  const laceStrip = buildEmailLaceStripHtml();
  const crestHtml = buildEmailBotanicalCrestHtml();
  const stampHtml = buildEmailPostageStampHtml();
  const ruledPaperHtml = buildRuledPaperLinesHtml(message);
  const waxSealHtml = buildEmailWaxSealHtml();

  const html = `
    <div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;background-color:#EFE5D8;padding:32px 14px;color:#231C18;">
      <!-- Stacked Deckled Kraft Paper Backing -->
      <div style="max-width:560px;margin:0 auto;background-color:#E4D4C3;border:1px dashed #C4AC96;border-radius:26px;padding:6px 7px 10px 6px;">
        <!-- Primary Warm Cotton Parchment Stationery Sheet -->
        <div style="background-color:#FAF3E9;border:1.5px dashed #CEB7A2;border-radius:22px;overflow:hidden;box-shadow:0 12px 30px rgba(110,68,52,0.08);">
          ${laceStrip}

          <div style="padding:24px 24px 26px 24px;">
            <!-- Centered Botanical Blossom Crest & Title -->
            <div style="text-align:center;padding-bottom:16px;border-bottom:1px dashed #E2D1C1;">
              ${crestHtml}
              <div style="margin-top:8px;font-size:22px;font-weight:600;color:#231C18;letter-spacing:-0.01em;">
                Send A Bouquet
              </div>
              <div style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#7D6B60;margin-top:2px;">
                Handcrafted Digital Floral Studio
              </div>
            </div>

            <!-- Postcard Salutation Row + Perforated Floral Postage Stamp -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 10px 0;">
              <tr>
                <td valign="middle" align="left">
                  <div style="font-size:26px;font-weight:500;font-style:italic;color:#1F1815;">
                    ${greeting}
                  </div>
                </td>
                <td valign="middle" align="right">
                  ${stampHtml}
                </td>
              </tr>
            </table>

            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13.5px;line-height:1.75;color:#5C4438;margin:0 0 16px 0;">
              Thank you for writing to Send A Bouquet. Your note has been safely received, and I’ll read it soon. Here is a keepsake copy of what you wrote:
            </p>

            <!-- Tactile Ruled Paper Sheet -->
            <div style="background-color:#FFFDF9;border:1px dashed #DECBB9;border-radius:16px;padding:12px 18px 18px 18px;">
              <div style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#8C7A70;margin-bottom:4px;">
                Topic: ${escapeHtml(topicLabel)}
              </div>
              ${ruledPaperHtml}
            </div>

            <!-- Bottom Postcard Signature & Crimson Wax Seal -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;padding-top:14px;border-top:1px dashed #DECBB9;">
              <tr>
                <td valign="middle" align="left">
                  <div style="font-size:16px;font-style:italic;color:#5C4438;line-height:1.5;">
                    Warmly,<br/>
                    <strong style="color:#231C18;font-style:normal;">Send A Bouquet</strong> · <a href="mailto:hello@sendabouquet.online" style="color:#6E4434;text-decoration:underline;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;font-style:normal;">hello@sendabouquet.online</a>
                  </div>
                </td>
                <td valign="middle" align="right" width="52">
                  ${waxSealHtml}
                </td>
              </tr>
            </table>
          </div>

          ${laceStrip}
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

  const laceStrip = buildEmailLaceStripHtml();
  const crestHtml = buildEmailBotanicalCrestHtml();
  const stampHtml = buildEmailPostageStampHtml();
  const waxSealHtml = buildEmailWaxSealHtml();

  const keepsakeItems = ['Handcrafted floral arrangement', 'Personal greeting card'];
  if (hasPhotoCard) keepsakeItems.push('Framed photo keepsake');
  if (hasVoiceNote) keepsakeItems.push('Recorded voice keepsake');
  if (isLocked) keepsakeItems.push('Sealed behind a special lock');

  const surpriseLines = [
    'Someone special has arranged and sealed a digital bouquet just for you.',
    'Their name and personal note are tucked inside the flowers—waiting for',
    'you to untie the ribbon and watch each stem bloom on your screen.',
    `Included: ${keepsakeItems.join(' · ')}`,
  ];
  const ruledPaperHtml = buildRuledPaperLinesHtml(surpriseLines.join('\n'));

  const html = `
    <div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;background-color:#EFE5D8;padding:32px 14px;color:#231C18;">
      <!-- Stacked Deckled Kraft Paper Backing -->
      <div style="max-width:560px;margin:0 auto;background-color:#E4D4C3;border:1px dashed #C4AC96;border-radius:26px;padding:6px 7px 10px 6px;">
        <!-- Primary Warm Cotton Parchment Stationery Sheet -->
        <div style="background-color:#FAF3E9;border:1.5px dashed #CEB7A2;border-radius:22px;overflow:hidden;box-shadow:0 12px 30px rgba(110,68,52,0.08);">
          ${laceStrip}

          <div style="padding:24px 24px 26px 24px;">
            <!-- Centered Botanical Blossom Crest -->
            <div style="text-align:center;padding-bottom:16px;border-bottom:1px dashed #E2D1C1;">
              ${crestHtml}
              <div style="margin-top:8px;font-size:21px;font-weight:600;color:#231C18;letter-spacing:-0.01em;">
                Send A Bouquet
              </div>
              <div style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#7D6B60;margin-top:2px;">
                A Surprise Floral Delivery
              </div>
            </div>

            <!-- Recipient Dedication + Perforated Floral Postage Stamp -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 12px 0;">
              <tr>
                <td valign="middle" align="left">
                  <div style="font-size:17px;font-style:italic;color:#6E594E;">
                    For ${escapeHtml(cleanRecipient || 'You')},
                  </div>
                  <div style="font-size:30px;font-weight:600;color:#1F1815;line-height:1.15;margin-top:2px;">
                    Someone sent you a Bouquet
                  </div>
                </td>
                <td valign="middle" align="right">
                  ${stampHtml}
                </td>
              </tr>
            </table>

            <!-- Tactile Ruled Paper Sheet -->
            <div style="background-color:#FFFDF9;border:1px dashed #DECBB9;border-radius:16px;padding:12px 18px 18px 18px;">
              ${ruledPaperHtml}
            </div>

            <!-- Unwrap Bouquet CTA Button -->
            <div style="text-align:center;margin:22px 0 18px 0;">
              <a href="${escapeHtml(giftUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 30px;border-radius:999px;background-color:#6E4434;color:#FFFDF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13.5px;font-weight:600;text-decoration:none;border:1px dashed #E6B89C;box-shadow:0 6px 18px rgba(110,68,52,0.18);">
                Unwrap Your Bouquet &rarr;
              </a>
            </div>

            <!-- Bottom Postcard Signature & Crimson Wax Seal -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;padding-top:14px;border-top:1px dashed #DECBB9;">
              <tr>
                <td valign="middle" align="left" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11.5px;color:#7D6B60;line-height:1.6;">
                  <div>Sealed with a secret note · Open the link above to reveal who sent this bouquet.</div>
                  <div style="margin-top:3px;word-break:break-all;">
                    Direct link: <a href="${escapeHtml(giftUrl)}" style="color:#6E4434;text-decoration:underline;">${escapeHtml(giftUrl)}</a>
                  </div>
                </td>
                <td valign="middle" align="right" width="52">
                  ${waxSealHtml}
                </td>
              </tr>
            </table>
          </div>

          ${laceStrip}
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
