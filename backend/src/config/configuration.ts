export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/atkplan',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'changeme-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  uploadDest: process.env.UPLOAD_DEST ?? './uploads',
});
