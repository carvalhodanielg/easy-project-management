export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/atkplan',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'changeme-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  invitations: {
    // How long a space invitation link stays valid, in days.
    expiresInDays: parseInt(process.env.INVITATION_EXPIRES_IN_DAYS ?? '7', 10),
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
