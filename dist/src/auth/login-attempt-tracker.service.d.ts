export declare class LoginAttemptTrackerService {
    private readonly attempts;
    isLocked(key: string): boolean;
    recordFailure(key: string): void;
    reset(key: string): void;
}
