import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoomisError } from '../../../shared/errors.js';

const mockUserRepository = {
  getUserVer: vi.fn(),
};

const redisStore = new Map<string, string>();

vi.mock('../repository/user.repository.js', () => ({
  userRepository: mockUserRepository,
}));

vi.mock('../../../shared/redis.js', () => ({
  getRedis: () => ({
    get: vi.fn(async (key: string) => redisStore.get(key) ?? null),
    setex: vi.fn(async (key: string, _ttl: number, value: string) => {
      redisStore.set(key, value);
      return 'OK';
    }),
    del: vi.fn(async (key: string) => {
      redisStore.delete(key);
      return 1;
    }),
    zadd: vi.fn(),
    zscore: vi.fn(),
    zremrangebyscore: vi.fn(),
  }),
}));

const { tokenService } = await import('./token.service.js');

describe('tokenService.assertUserVerValid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisStore.clear();
  });

  it('accepts a token whose user_ver matches the current value', async () => {
    mockUserRepository.getUserVer.mockResolvedValue(7);
    await expect(tokenService.assertUserVerValid('user-1', 7)).resolves.toBeUndefined();
  });

  it('rejects a token when user_ver has been bumped', async () => {
    mockUserRepository.getUserVer.mockResolvedValue(8);

    await expect(tokenService.assertUserVerValid('user-1', 7)).rejects.toBeInstanceOf(
      LoomisError,
    );
    await expect(tokenService.assertUserVerValid('user-1', 7)).rejects.toMatchObject({
      code: 'IDENTITY_SESSION_INVALIDATED',
      statusCode: 401,
    });
  });
});
