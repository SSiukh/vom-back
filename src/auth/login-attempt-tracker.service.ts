import { Injectable } from '@nestjs/common';

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

interface AttemptWindow {
  count: number;
  windowStart: number;
}

@Injectable()
export class LoginAttemptTrackerService {
  private readonly attempts = new Map<string, AttemptWindow>();

  isLocked(key: string): boolean {
    const window = this.attempts.get(key);
    if (!window) {
      return false;
    }

    if (Date.now() - window.windowStart > WINDOW_MS) {
      this.attempts.delete(key);
      return false;
    }

    return window.count >= MAX_ATTEMPTS;
  }

  recordFailure(key: string): void {
    const window = this.attempts.get(key);
    if (!window || Date.now() - window.windowStart > WINDOW_MS) {
      this.attempts.set(key, { count: 1, windowStart: Date.now() });
      return;
    }

    window.count += 1;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}
