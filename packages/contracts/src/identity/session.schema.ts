import { z } from 'zod';

export const devicePlatform = z.enum(['ios', 'android', 'web']);
export type DevicePlatform = z.infer<typeof devicePlatform>;

export const sessionSummary = z.object({
  id: z.string().uuid(),
  platform: devicePlatform.nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  issuedAt: z.string().datetime(),
  lastActiveAt: z.string().datetime(),
  idleExpiresAt: z.string().datetime(),
  absExpiresAt: z.string().datetime(),
  isCurrent: z.boolean(),
});
export type SessionSummary = z.infer<typeof sessionSummary>;

export const sessionListResponse = z.object({
  sessions: z.array(sessionSummary),
});
export type SessionListResponse = z.infer<typeof sessionListResponse>;

export const revokeSessionRequest = z.object({
  sessionId: z.string().uuid(),
});
export type RevokeSessionRequest = z.infer<typeof revokeSessionRequest>;

export const registeredDeviceSummary = z.object({
  id: z.string().uuid(),
  platform: devicePlatform,
  registeredAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  hasPersistentToken: z.boolean(),
  persistentTokenExpiresAt: z.string().datetime().nullable(),
});
export type RegisteredDeviceSummary = z.infer<typeof registeredDeviceSummary>;

export const deviceListResponse = z.object({
  devices: z.array(registeredDeviceSummary),
});
export type DeviceListResponse = z.infer<typeof deviceListResponse>;

export const deregisterDeviceRequest = z.object({
  deviceId: z.string().uuid(),
});
export type DeregisterDeviceRequest = z.infer<typeof deregisterDeviceRequest>;

export const refreshTokenRequest = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequest>;

export const refreshTokenResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.string().datetime(),
});
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponse>;

export const logoutRequest = z.object({
  refreshToken: z.string().min(1).optional(),
  allDevices: z.boolean().default(false),
});
export type LogoutRequest = z.infer<typeof logoutRequest>;
