import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoomisError } from '../../../shared/errors.js';

const mockTokenRepository = {
  findByHash: vi.fn(),
  markUsed: vi.fn(),
  revoke: vi.fn(),
  create: vi.fn(),
  revokeFamily: vi.fn(),
};

const mockSessionRepository = {
  findById: vi.fn(),
};

const mockUserRepository = {
  findById: vi.fn(),
  countRecentFailedAttempts: vi.fn(),
  setStatus: vi.fn(),
  isAccountLocked: vi.fn(),
  findByEmail: vi.fn(),
  recordLoginAttempt: vi.fn(),
};

const mockSessionService = {
  revokeSession: vi.fn(),
  slideIdle: vi.fn(),
  createSession: vi.fn(),
};

const mockTokenService = {
  hashRefreshToken: vi.fn((raw: string) => `hash:${raw}`),
  generateRefreshToken: vi.fn(() => 'new-refresh-token'),
  signAccessToken: vi.fn(async () => ({
    token: 'new-access-token',
    jti: 'jti-new',
    expiresAt: new Date('2026-12-31T00:00:00.000Z'),
  })),
};

vi.mock('../../../shared/db.js', () => ({
  db: {
    transaction: vi.fn(async (fn: (tx: object) => unknown) => fn({})),
  },
}));

vi.mock('../repository/token.repository.js', () => ({
  tokenRepository: mockTokenRepository,
}));

vi.mock('../repository/session.repository.js', () => ({
  sessionRepository: mockSessionRepository,
}));

vi.mock('../repository/user.repository.js', () => ({
  userRepository: mockUserRepository,
}));

vi.mock('./session.service.js', () => ({
  sessionService: mockSessionService,
}));

vi.mock('./token.service.js', () => ({
  tokenService: mockTokenService,
}));

vi.mock('./device.service.js', () => ({ deviceService: {} }));
vi.mock('./mfa.service.js', () => ({ mfaService: {} }));
vi.mock('./password.service.js', () => ({ passwordService: {} }));
vi.mock('../repository/mfa.repository.js', () => ({ mfaRepository: {} }));
vi.mock('../../../shared/redis.js', () => ({
  getRedis: () => ({
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
  }),
}));

const { authService } = await import('./auth.service.js');

describe('authService.refresh', () => {
  const future = new Date(Date.now() + 60_000);
  const activeSession = {
    id: 'session-1',
    userId: 'user-1',
    revoked: false,
    absExpiresAt: future,
    platform: 'web',
  };
  const activeUser = {
    id: 'user-1',
    role: 'teacher',
    tenantId: 'tenant-1',
    userVer: 3,
    status: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rotates a valid refresh token and issues new credentials', async () => {
    mockTokenRepository.findByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      sessionId: 'session-1',
      familyId: 'family-1',
      expiresAt: future,
      revoked: false,
      usedAt: null,
      deviceId: null,
    });
    mockSessionRepository.findById.mockResolvedValue(activeSession);
    mockUserRepository.findById.mockResolvedValue(activeUser);

    const result = await authService.refresh('old-refresh');

    expect(mockTokenRepository.markUsed).toHaveBeenCalledWith('rt-1', expect.anything());
    expect(mockTokenRepository.revoke).toHaveBeenCalledWith('rt-1', expect.anything());
    expect(mockTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        familyId: 'family-1',
        tokenHash: 'hash:new-refresh-token',
      }),
      expect.anything(),
    );
    expect(mockSessionService.slideIdle).toHaveBeenCalled();
    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
  });

  it('detects replay of a used refresh token and revokes the family', async () => {
    mockTokenRepository.findByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      sessionId: 'session-1',
      familyId: 'family-1',
      expiresAt: future,
      revoked: false,
      usedAt: new Date(),
    });

    await expect(authService.refresh('replayed-refresh')).rejects.toMatchObject({
      code: 'IDENTITY_SESSION_INVALIDATED',
    });

    expect(mockTokenRepository.revokeFamily).toHaveBeenCalledWith('family-1', expect.anything());
    expect(mockSessionService.revokeSession).toHaveBeenCalledWith(
      'session-1',
      'token_replay',
      expect.anything(),
    );
    expect(mockTokenRepository.create).not.toHaveBeenCalled();
  });
});

describe('authService lockout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('locks the account after five failures within the window', async () => {
    mockUserRepository.countRecentFailedAttempts.mockResolvedValue(5);
    mockUserRepository.setStatus.mockResolvedValue({ id: 'user-1', status: 'locked' });

    await authService.enforceLockoutThreshold('user@school.ng', {
      id: 'user-1',
      email: 'user@school.ng',
      passwordHash: 'hash',
      role: 'teacher',
      tenantId: 'tenant-1',
      userVer: 1,
      status: 'active',
      lockedUntil: null,
      mfaRequired: false,
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(mockUserRepository.setStatus).toHaveBeenCalledWith(
      'user-1',
      'locked',
      expect.any(Date),
    );
  });

  it('rejects login when the account is already locked', async () => {
    mockUserRepository.isAccountLocked.mockResolvedValue(true);

    await expect(
      authService.login('locked@school.ng', 'password', { platform: 'web' }),
    ).rejects.toMatchObject({
      code: 'IDENTITY_ACCOUNT_LOCKED',
      statusCode: 423,
    });
  });
});
