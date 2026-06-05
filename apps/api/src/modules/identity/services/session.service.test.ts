import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSessionRepository = {
  listActiveByUserId: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
};

const mockTokenRepository = {
  revokeBySessionId: vi.fn(),
};

vi.mock('../repository/session.repository.js', () => ({
  sessionRepository: mockSessionRepository,
}));

vi.mock('../repository/token.repository.js', () => ({
  tokenRepository: mockTokenRepository,
}));

const { sessionService } = await import('./session.service.js');

describe('sessionService.createSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displaces the oldest session when the concurrent limit is reached', async () => {
    const oldest = {
      id: 'session-oldest',
      userId: 'user-1',
      issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      revoked: false,
      absExpiresAt: new Date(Date.now() + 3_600_000),
    };
    const activeSessions = [
      oldest,
      { id: 'session-2', userId: 'user-1', issuedAt: new Date('2026-01-02') },
      { id: 'session-3', userId: 'user-1', issuedAt: new Date('2026-01-03') },
      { id: 'session-4', userId: 'user-1', issuedAt: new Date('2026-01-04') },
      { id: 'session-5', userId: 'user-1', issuedAt: new Date('2026-01-05') },
    ];

    mockSessionRepository.listActiveByUserId.mockResolvedValue(activeSessions);
    mockSessionRepository.revoke.mockResolvedValue({ ...oldest, revoked: true });
    mockSessionRepository.create.mockResolvedValue({
      id: 'session-new',
      userId: 'user-1',
      platform: 'web',
      issuedAt: new Date(),
      lastActiveAt: new Date(),
      idleExpiresAt: new Date(Date.now() + 1_800_000),
      absExpiresAt: new Date(Date.now() + 28_800_000),
      revoked: false,
    });

    const result = await sessionService.createSession('user-1', { platform: 'web' });

    expect(mockSessionRepository.revoke).toHaveBeenCalledWith(
      'session-oldest',
      'concurrent_limit',
      undefined,
    );
    expect(mockTokenRepository.revokeBySessionId).toHaveBeenCalledWith(
      'session-oldest',
      undefined,
    );
    expect(result.displacedSessionId).toBe('session-oldest');
    expect(result.session.id).toBe('session-new');
  });
});
