import { Resend } from 'resend';
import { APP_CONFIG } from '../config.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${APP_CONFIG.frontendUrl}/verify-email?token=${token}`;
  const accent = APP_CONFIG.accentColor;

  await resend.emails.send({
    from: `${APP_CONFIG.emailFromName} <${APP_CONFIG.emailFrom}>`,
    to,
    subject: `Verify your ${APP_CONFIG.name} account`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h1 style="font-size: 1.5rem; color: #e4e4e7; margin-bottom: 1rem;">
          Welcome to <span style="color: ${accent};">${APP_CONFIG.name}</span>
        </h1>
        <p style="color: #8b8d98; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
          Thanks for signing up. Please verify your email address by clicking the button below.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; background: ${accent}; color: #fff; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.95rem;">
          Verify Email Address
        </a>
        <p style="color: #8b8d98; font-size: 0.8rem; margin-top: 1.5rem;">
          This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #2a2d3a; margin: 2rem 0;" />
        <p style="color: #8b8d98; font-size: 0.75rem;">
          ${APP_CONFIG.name} – ${APP_CONFIG.tagline}
        </p>
      </div>
    `,
  });
}

export async function sendInviteEmail(to: string, token: string, inviterEmail: string): Promise<void> {
  const inviteUrl = `${APP_CONFIG.frontendUrl}/accept-invite?token=${token}`;
  const accent = APP_CONFIG.accentColor;

  await resend.emails.send({
    from: `${APP_CONFIG.emailFromName} <${APP_CONFIG.emailFrom}>`,
    to,
    subject: `You've been invited to ${APP_CONFIG.name}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h1 style="font-size: 1.5rem; color: #e4e4e7; margin-bottom: 1rem;">
          Welcome to <span style="color: ${accent};">${APP_CONFIG.name}</span>
        </h1>
        <p style="color: #8b8d98; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1rem;">
          <strong style="color: #e4e4e7;">${inviterEmail}</strong> has invited you to join ${APP_CONFIG.name}.
        </p>
        <p style="color: #8b8d98; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
          Click the button below to set up your password and activate your account.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background: ${accent}; color: #fff; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.95rem;">
          Set Up Your Account
        </a>
        <p style="color: #8b8d98; font-size: 0.8rem; margin-top: 1.5rem;">
          This link expires in 7 days. If you weren't expecting this invite, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #2a2d3a; margin: 2rem 0;" />
        <p style="color: #8b8d98; font-size: 0.75rem;">
          ${APP_CONFIG.name} – ${APP_CONFIG.tagline}
        </p>
      </div>
    `,
  });
}
