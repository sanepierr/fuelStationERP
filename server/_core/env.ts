import { SESSION_TTL_MS } from "@shared/const";

export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  webhookSecret: process.env.WEBHOOK_SECRET ?? "",
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL ?? "",
  sessionTtlMs: process.env.SESSION_TTL_MS ? parseInt(process.env.SESSION_TTL_MS) : SESSION_TTL_MS,
  isProduction: process.env.NODE_ENV === "production",
  // Legacy / optional — kept so existing code referencing them doesn't crash
  appId: process.env.VITE_APP_ID ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
