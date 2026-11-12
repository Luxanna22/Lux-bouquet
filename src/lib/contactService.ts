import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getOrCreateDeviceTokenHash, StudioPassRecord } from './monetization';

export const OFFICIAL_STUDIO_EMAIL = 'hello@sendabouquet.online';

export type ContactTopicId = 'flower_wish' | 'feedback' | 'order_help' | 'general';

export interface ContactTopicOption {
  id: ContactTopicId;
  label: string;
  placeholder: string;
}

export const CONTACT_TOPICS: readonly ContactTopicOption[] = [
  {
    id: 'flower_wish',
    label: 'Flower Wish',
    placeholder: 'Which flower, wrapper, or ribbon would you love me to draw next?',
  },
  {
    id: 'feedback',
    label: 'Feedback',
    placeholder: 'Share your thoughts, an idea, or something that felt off...',
  },
  {
    id: 'order_help',
    label: 'Order Help',
    placeholder: 'Need help with a Pass, Ko-fi order, or gift link? Share your details here...',
  },
  {
    id: 'general',
    label: 'General Note',
    placeholder: 'Write a little note, a hello, or anything on your mind...',
  },
] as const;

export interface ContactSubmissionInput {
  topic?: string;
  name?: string;
  replyToEmail?: string;
  message?: string;
}

export interface ValidatedContactPayload {
  topic: ContactTopicId;
  topicLabel: string;
  senderName: string;
  replyToEmail: string;
  message: string;
}

export type ContactValidationResult =
  | { ok: true; value: ValidatedContactPayload }
  | { ok: false; error: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getContactTopicOption(topicId?: string): ContactTopicOption {
  const found = CONTACT_TOPICS.find((t) => t.id === topicId);
  return found || CONTACT_TOPICS[0];
}

export function validateContactSubmission(input: ContactSubmissionInput): ContactValidationResult {
  const topicOption =
    CONTACT_TOPICS.find((t) => t.id === (input.topic || '').trim()) ||
    CONTACT_TOPICS[3]; // default 'general'

  const senderName = typeof input.name === 'string' ? input.name.trim().slice(0, 80) : '';
  const replyToEmail =
    typeof input.replyToEmail === 'string' ? input.replyToEmail.trim().slice(0, 120) : '';
  const message = typeof input.message === 'string' ? input.message.trim() : '';

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

  if (topicOption.id === 'order_help' && !replyToEmail) {
    return {
      ok: false,
      error: 'Please include your email address in "Reply to" so I can help with your order.',
    };
  }

  return {
    ok: true,
    value: {
      topic: topicOption.id,
      topicLabel: topicOption.label,
      senderName,
      replyToEmail,
      message,
    },
  };
}

export function generateClientContactMessageId(nowMs = Date.now()): string {
  const randomSuffix =
    Math.random()
      .toString(36)
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8) || 'note1234';
  return `msg_${nowMs}_${randomSuffix.padEnd(6, '0')}`;
}

export interface ContactDeliveryResult {
  ok: boolean;
  messageId?: string;
  topic: ContactTopicId;
  topicLabel: string;
  emailDispatched: boolean;
  autoReplySent: boolean;
  savedToFirestore: boolean;
  confirmationRecipient: string | null;
  error?: string;
}

export async function submitContactNote(
  input: ContactSubmissionInput
): Promise<ContactDeliveryResult> {
  const validation = validateContactSubmission(input);
  if (!validation.ok) {
    const fallbackTopic = getContactTopicOption(input.topic);
    return {
      ok: false,
      topic: fallbackTopic.id,
      topicLabel: fallbackTopic.label,
      emailDispatched: false,
      autoReplySent: false,
      savedToFirestore: false,
      confirmationRecipient: null,
      error: validation.error,
    };
  }

  const { topic, topicLabel, senderName, replyToEmail, message } = validation.value;

  try {
    const resp = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        name: senderName,
        replyToEmail,
        message,
      }),
    });

    const data = await resp.json().catch(() => null);
    if (resp.ok && data?.ok) {
      return {
        ok: true,
        messageId: data.messageId,
        topic,
        topicLabel: data.topicLabel || topicLabel,
        emailDispatched: Boolean(data.emailDispatched),
        autoReplySent: Boolean(data.autoReplySent),
        savedToFirestore: Boolean(data.savedToFirestore),
        confirmationRecipient: data.confirmationRecipient || (replyToEmail ? replyToEmail : null),
      };
    }

    if (resp.status === 400 && data?.error) {
      return {
        ok: false,
        topic,
        topicLabel,
        emailDispatched: false,
        autoReplySent: false,
        savedToFirestore: false,
        confirmationRecipient: null,
        error: String(data.error),
      };
    }
  } catch {
    // Fall through to client-side Firestore backup if API endpoint is unreachable
  }

  // Client-side Firestore backup so visitor notes are never lost
  try {
    const messageId = generateClientContactMessageId();
    const createdAt = new Date().toISOString();
    await setDoc(doc(db, 'contact_messages', messageId), {
      messageId,
      topic,
      topicLabel,
      senderName,
      replyToEmail,
      message,
      emailDispatched: false,
      autoReplySent: false,
      createdAt,
    });

    return {
      ok: true,
      messageId,
      topic,
      topicLabel,
      emailDispatched: false,
      autoReplySent: false,
      savedToFirestore: true,
      confirmationRecipient: replyToEmail || null,
    };
  } catch {
    return {
      ok: false,
      topic,
      topicLabel,
      emailDispatched: false,
      autoReplySent: false,
      savedToFirestore: false,
      confirmationRecipient: null,
      error: `Could not send your note right now. Please try again or email ${OFFICIAL_STUDIO_EMAIL}.`,
    };
  }
}

export interface BouquetEmailDeliveryInput {
  recipientEmail: string;
  recipientName?: string;
  giftUrl: string;
  hasVoiceNote?: boolean;
  hasPhotoCard?: boolean;
  isLocked?: boolean;
  pass?: StudioPassRecord | null;
  deviceTokenHash?: string;
  bouquetCode?: string | null;
}

export interface BouquetEmailDeliveryResult {
  ok: boolean;
  recipientEmail?: string;
  subject?: string;
  emailDispatched?: boolean;
  error?: string;
}

export function validateBouquetEmailDelivery(
  input: BouquetEmailDeliveryInput
): {
  ok: true;
  value: {
    recipientEmail: string;
    recipientName: string;
    giftUrl: string;
    hasVoiceNote: boolean;
    hasPhotoCard: boolean;
    isLocked: boolean;
    pass: StudioPassRecord | null;
    deviceTokenHash: string;
    bouquetCode: string;
  };
} | { ok: false; error: string } {
  const recipientEmail =
    typeof input.recipientEmail === 'string' ? input.recipientEmail.trim().slice(0, 120) : '';
  const recipientName =
    typeof input.recipientName === 'string' ? input.recipientName.trim().slice(0, 60) : '';
  const giftUrl = typeof input.giftUrl === 'string' ? input.giftUrl.trim().slice(0, 2000) : '';

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
      hasVoiceNote: Boolean(input.hasVoiceNote),
      hasPhotoCard: Boolean(input.hasPhotoCard),
      isLocked: Boolean(input.isLocked),
      pass: input.pass || null,
      deviceTokenHash: input.deviceTokenHash || getOrCreateDeviceTokenHash(),
      bouquetCode: typeof input.bouquetCode === 'string' ? input.bouquetCode.trim() : '',
    },
  };
}

export async function sendBouquetSurpriseEmail(
  input: BouquetEmailDeliveryInput
): Promise<BouquetEmailDeliveryResult> {
  const validated = validateBouquetEmailDelivery(input);
  if (!validated.ok) {
    return {
      ok: false,
      error: validated.error,
    };
  }

  if (!validated.value.pass) {
    return {
      ok: false,
      error: 'Surprise email delivery is a Couture feature. Unlock this bouquet or activate a Bloom Pass first.',
    };
  }

  try {
    const resp = await fetch('/api/send-bouquet-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated.value),
    });

    const data = await resp.json().catch(() => null);
    if (resp.ok && data?.ok) {
      return {
        ok: true,
        recipientEmail: data.recipientEmail || validated.value.recipientEmail,
        subject: data.subject,
        emailDispatched: Boolean(data.emailDispatched),
      };
    }

    return {
      ok: false,
      error: data?.error || 'Could not send surprise email right now. Please try again.',
    };
  } catch {
    return {
      ok: false,
      error: 'Could not send surprise email right now. Please try again.',
    };
  }
}

