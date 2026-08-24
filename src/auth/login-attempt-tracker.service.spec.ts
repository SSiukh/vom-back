import { LoginAttemptTrackerService } from './login-attempt-tracker.service';

describe('LoginAttemptTrackerService', () => {
  let service: LoginAttemptTrackerService;

  beforeEach(() => {
    service = new LoginAttemptTrackerService();
  });

  it('is not locked for a key with no recorded failures', () => {
    expect(service.isLocked('user-id')).toBe(false);
  });

  it('is not locked below the max-attempts threshold', () => {
    for (let i = 0; i < 9; i++) {
      service.recordFailure('user-id');
    }

    expect(service.isLocked('user-id')).toBe(false);
  });

  it('locks once the max-attempts threshold is reached', () => {
    for (let i = 0; i < 10; i++) {
      service.recordFailure('user-id');
    }

    expect(service.isLocked('user-id')).toBe(true);
  });

  it('resets the failure count for a key', () => {
    for (let i = 0; i < 10; i++) {
      service.recordFailure('user-id');
    }
    service.reset('user-id');

    expect(service.isLocked('user-id')).toBe(false);
  });

  it('tracks separate keys independently', () => {
    for (let i = 0; i < 10; i++) {
      service.recordFailure('user-a');
    }

    expect(service.isLocked('user-a')).toBe(true);
    expect(service.isLocked('user-b')).toBe(false);
  });

  it('expires the lockout window after it elapses', () => {
    const now = Date.now();
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    for (let i = 0; i < 10; i++) {
      service.recordFailure('user-id');
    }
    expect(service.isLocked('user-id')).toBe(true);

    dateSpy.mockReturnValue(now + 15 * 60 * 1000 + 1);

    expect(service.isLocked('user-id')).toBe(false);

    dateSpy.mockRestore();
  });
});
