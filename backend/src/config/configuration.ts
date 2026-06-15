/**
 * Resolve the JWT signing secret. A weak default is fine for local/dev, but in
 * production a missing secret must fail fast rather than silently sign tokens
 * with a publicly-known string.
 */
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return 'changeme-in-production';
}

export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/atkplan',
  jwt: {
    secret: resolveJwtSecret(),
    // Short-lived access token; sessions are kept alive by the refresh token.
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  },
  refreshToken: {
    // How long a refresh token stays valid, in days.
    expiresInDays: parseInt(
      process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS ?? '30',
      10,
    ),
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  invitations: {
    // How long a space invitation link stays valid, in days.
    expiresInDays: parseInt(process.env.INVITATION_EXPIRES_IN_DAYS ?? '7', 10),
  },
  passwordReset: {
    // How long a password reset link stays valid, in minutes.
    expiresInMinutes: parseInt(
      process.env.PASSWORD_RESET_EXPIRES_IN_MINUTES ?? '60',
      10,
    ),
  },
  emailVerification: {
    // How long an email verification link stays valid, in hours.
    expiresInHours: parseInt(
      process.env.EMAIL_VERIFICATION_EXPIRES_IN_HOURS ?? '24',
      10,
    ),
  },
  uploadDest: process.env.UPLOAD_DEST ?? './uploads',
  r2: {
    endpoint: process.env.R2_ENDPOINT ?? '', // custom endpoint (MinIO dev); if empty, uses R2 default
    accountId: process.env.R2_ACCOUNT_ID ?? '', // only needed for real R2 (ignored when endpoint set)
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET_NAME ?? '',
    publicUrl: process.env.R2_PUBLIC_URL ?? '',
  },
});
