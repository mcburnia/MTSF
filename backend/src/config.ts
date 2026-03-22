/**
 * White-label configuration.
 *
 * Override these values via environment variables to rebrand the entire platform.
 * Every email, error message, and API response references this config
 * instead of hardcoded product names.
 */

export const APP_CONFIG = {
  /** Display name shown in emails, UI, and API responses */
  name: process.env.APP_NAME || 'MTSF',

  /** Tagline used in emails and public pages */
  tagline: process.env.APP_TAGLINE || 'Multi-Tenant SaaS Framework',

  /** Email sender name */
  emailFromName: process.env.APP_EMAIL_FROM_NAME || process.env.APP_NAME || 'MTSF',

  /** Email sender address */
  emailFrom: process.env.EMAIL_FROM || 'noreply@example.com',

  /** Frontend URL */
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3002',

  /** Whether to skip email sending in development */
  devSkipEmail: process.env.DEV_SKIP_EMAIL === 'true',

  /** Test mode flag */
  testMode: process.env.MTSF_TEST_MODE === 'true',

  /** E2E mode flag */
  e2eMode: process.env.MTSF_E2E_MODE === 'true',

  /** API key prefix for public API keys */
  apiKeyPrefix: process.env.API_KEY_PREFIX || 'mtsf_',

  /** Default trial duration in days */
  trialDays: parseInt(process.env.TRIAL_DAYS || '14', 10),

  /** Accent colour hex (for emails) */
  accentColor: process.env.APP_ACCENT_COLOR || '#3b82f6',
} as const;
