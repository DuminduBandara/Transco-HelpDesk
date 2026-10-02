// lib/email.ts
import nodemailer from 'nodemailer';

// In-memory token cache for Microsoft Entra ID (Graph API)
let entraTokenCache: { token: string; expiresAt: number } | null = null;

async function getEntraAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const now = Date.now();
  // Return cached token if valid for at least another 60 seconds
  if (entraTokenCache && entraTokenCache.expiresAt > now + 60_000) {
    return entraTokenCache.token;
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Entra ID OAuth token acquisition failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const expiresIn = (data.expires_in || 3600) * 1000;
  entraTokenCache = {
    token: data.access_token,
    expiresAt: now + expiresIn,
  };

  return data.access_token;
}

async function sendViaEntraGraph(to: string, subject: string, html: string) {
  const tenantId = process.env.AZURE_TENANT_ID || process.env.ENTRA_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID || process.env.ENTRA_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET || process.env.ENTRA_CLIENT_SECRET;

  // Sender mailbox address (e.g. it-helpdesk@organization.com)
  const rawSender =
    process.env.AZURE_SENDER_EMAIL ||
    process.env.ENTRA_SENDER_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    '';

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing Microsoft Entra ID configuration (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET).');
  }

  const senderEmail = rawSender.includes('<')
    ? rawSender.replace(/.*<([^>]+)>.*/, '$1').trim()
    : rawSender.trim();

  if (!senderEmail) {
    throw new Error('Sender mailbox address is missing. Please set AZURE_SENDER_EMAIL in .env.local.');
  }

  const token = await getEntraAccessToken(tenantId, clientId, clientSecret);
  const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;

  // Optional display name from EMAIL_FROM (e.g. "Transco HelpDesk")
  const displayName = rawSender.includes('<')
    ? rawSender.replace(/<.*/, '').replace(/["']/g, '').trim()
    : 'Transco HelpDesk';

  const body = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: html,
      },
      from: {
        emailAddress: {
          name: displayName || 'Transco HelpDesk',
          address: senderEmail,
        },
      },
      toRecipients: [
        {
          emailAddress: {
            address: to.trim(),
          },
        },
      ],
    },
    saveToSentItems: true,
  };

  const response = await fetch(sendMailUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph sendMail failed (${response.status}): ${errorText}`);
  }

  console.log(`[Email - Entra ID Graph API] Successfully sent email to ${to}`);
  return { success: true };
}

// Fallback SMTP Transporter (Office 365 / Standard SMTP)
const host = process.env.SMTP_HOST || 'smtp.office365.com';
const port = Number(process.env.SMTP_PORT) || 587;
const secure = port === 465;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  const isEntraConfigured = Boolean(
    (process.env.AZURE_TENANT_ID || process.env.ENTRA_TENANT_ID) &&
    (process.env.AZURE_CLIENT_ID || process.env.ENTRA_CLIENT_ID) &&
    (process.env.AZURE_CLIENT_SECRET || process.env.ENTRA_CLIENT_SECRET)
  );

  if (isEntraConfigured) {
    try {
      return await sendViaEntraGraph(to, subject, html);
    } catch (error) {
      console.error(`[Email - Entra ID Graph API] Failed to send email to ${to}:`, error);
      return { success: false, error };
    }
  }

  // Fallback to SMTP if Entra ID credentials are not provided
  try {
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });
    console.log(`[Email - SMTP] Sent successfully to ${to} (Message ID: ${info?.messageId})`);
    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error(`[Email - SMTP] Failed to send email to ${to}:`, error);
    return { success: false, error };
  }
};