// Gmail service for scanning emails and downloading receipt attachments
import { google } from 'googleapis';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export interface GmailSearchOptions {
  query: string;
  maxResults?: number;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  messageId: string;
}

/**
 * Search for emails matching a query
 * Common queries:
 * - "has:attachment" - emails with attachments
 * - "has:attachment filename:jpg OR filename:png" - emails with image attachments
 * - "subject:receipt" - emails with "receipt" in subject
 * - "after:2024/01/01" - emails after a date
 */
// Helper function to recursively find attachments in email parts
function findAttachmentsInParts(parts: any[], messageId: string, attachments: EmailAttachment[]) {
  for (const part of parts) {
    if (part.filename && part.body?.attachmentId) {
      // Only include image attachments (JPG, PNG)
      if (part.mimeType === 'image/jpeg' || part.mimeType === 'image/jpg' || part.mimeType === 'image/png') {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
          messageId: messageId,
        });
      }
    }
    if (part.parts) {
      findAttachmentsInParts(part.parts, messageId, attachments);
    }
  }
}

export async function searchEmails(options: GmailSearchOptions): Promise<EmailMessage[]> {
  const gmail = await getUncachableGmailClient();
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: options.query,
    maxResults: options.maxResults || 10,
  });

  if (!response.data.messages) {
    return [];
  }

  const messages: EmailMessage[] = [];

  for (const msg of response.data.messages) {
    if (!msg.id) continue;

    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    });

    const headers = fullMessage.data.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';

    // Find attachments
    const attachments: EmailAttachment[] = [];
    
    if (fullMessage.data.payload?.parts) {
      findAttachmentsInParts(fullMessage.data.payload.parts, msg.id, attachments);
    }

    messages.push({
      id: msg.id,
      threadId: msg.threadId || '',
      subject,
      from,
      date,
      snippet: fullMessage.data.snippet || '',
      attachments,
    });
  }

  return messages;
}

/**
 * Download an attachment from a Gmail message
 * Returns the path to the downloaded file
 */
export async function downloadAttachment(attachment: EmailAttachment): Promise<string> {
  const gmail = await getUncachableGmailClient();

  const response = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: attachment.messageId,
    id: attachment.attachmentId,
  });

  if (!response.data.data) {
    throw new Error('No attachment data received');
  }

  // Decode base64url data
  const data = response.data.data.replace(/-/g, '+').replace(/_/g, '/');
  const buffer = Buffer.from(data, 'base64');

  // Save to uploads/receipts directory
  const uploadsDir = 'uploads/receipts';
  await fs.mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(attachment.filename) || (attachment.mimeType === 'image/png' ? '.png' : '.jpg');
  const filename = `${randomUUID()}${ext}`;
  const filePath = path.join(uploadsDir, filename);

  await fs.writeFile(filePath, buffer);

  return filePath;
}

/**
 * Search for receipt emails with image attachments
 */
export async function searchReceiptEmails(sinceDate?: Date): Promise<EmailMessage[]> {
  const dateQuery = sinceDate 
    ? `after:${sinceDate.getFullYear()}/${String(sinceDate.getMonth() + 1).padStart(2, '0')}/${String(sinceDate.getDate()).padStart(2, '0')}`
    : '';

  const query = [
    'has:attachment',
    '(filename:jpg OR filename:jpeg OR filename:png)',
    '(subject:receipt OR subject:invoice OR body:receipt OR body:invoice)',
    dateQuery,
  ].filter(Boolean).join(' ');

  return searchEmails({ query, maxResults: 50 });
}

/**
 * Get the count of unprocessed receipt emails
 */
export async function getUnprocessedReceiptCount(sinceDate?: Date): Promise<number> {
  const messages = await searchReceiptEmails(sinceDate);
  return messages.reduce((count, msg) => count + msg.attachments.length, 0);
}
