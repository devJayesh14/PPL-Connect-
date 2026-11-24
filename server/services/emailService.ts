import nodemailer, { Transporter } from 'nodemailer';

interface SendRetentionEmailParams {
  playerEmail: string;
  playerName: string;
  teamName: string;
  captainName: string;
  confirmationUrl: string;
}

export async function sendRetentionConfirmationEmail({
  playerEmail,
  playerName,
  teamName,
  captainName,
  confirmationUrl,
}: SendRetentionEmailParams): Promise<{ success: boolean; messageId?: string; previewUrl?: string }> {
  try {
    let transporter: Transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Create ethereal test account for dev/preview if no SMTP configured
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0A192F 0%, #1D4ED8 100%); padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">PRIYANKA PREMIERE LEAGUE (PPL)</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #F59E0B; font-weight: bold;">★ UNITED WE PLAY, UNITED WE WIN! ★</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Official Player Retention Offer</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Dear <strong>${playerName}</strong>,
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Franchise team <strong>${teamName}</strong> (Captain: <strong>${captainName}</strong>) has selected you for their <strong>Official Retention Slot</strong> for the upcoming PPL 2026 Season!
          </p>
          <div style="background-color: #f1f5f9; border-left: 4px solid #1D4ED8; padding: 14px; margin: 18px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Team:</strong> ${teamName}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #334155;"><strong>Status:</strong> Awaiting Your Official Confirmation</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #334155;"><strong>Points Deducted:</strong> 0 Points (Free Franchise Slot)</p>
          </div>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            As per PPL auction rules, the franchise captain can only retain you after you officially confirm this offer. If you accept, you will join ${teamName} directly and bypass the public auction pool.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${confirmationUrl}" style="background-color: #1D4ED8; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
              Review & Confirm Retention
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.4; word-break: break-all;">
            If the button doesn't work, copy and open this link in your browser:<br/>
            <a href="${confirmationUrl}" style="color: #1D4ED8;">${confirmationUrl}</a>
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          Priyanka Premiere League (PPL) Official Auction Portal • Automated Notification
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"PPL Connect" <no-reply@pplconnect.com>',
      to: playerEmail,
      subject: `Action Required: ${teamName} wants to retain you for PPL 2026!`,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      console.log(`[EMAIL] Retention email sent! Preview URL: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl: previewUrl ? String(previewUrl) : undefined };
  } catch (err: any) {
    console.error('[EMAIL] Failed to send retention confirmation email:', err.message);
    return { success: false };
  }
}
