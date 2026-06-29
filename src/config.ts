import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '8080', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ayazma',
  adminPin: process.env.ADMIN_PIN ?? '1234',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174').split(','),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') !== 'production',
};

export function assertProductionSecrets() {
  if (!config.isDev) {
    required('MONGODB_URI');
    required('JWT_SECRET');
    required('ADMIN_PIN');
  }
}
