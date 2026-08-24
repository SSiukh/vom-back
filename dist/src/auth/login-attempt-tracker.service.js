"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginAttemptTrackerService = void 0;
const common_1 = require("@nestjs/common");
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
let LoginAttemptTrackerService = class LoginAttemptTrackerService {
    attempts = new Map();
    isLocked(key) {
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
    recordFailure(key) {
        const window = this.attempts.get(key);
        if (!window || Date.now() - window.windowStart > WINDOW_MS) {
            this.attempts.set(key, { count: 1, windowStart: Date.now() });
            return;
        }
        window.count += 1;
    }
    reset(key) {
        this.attempts.delete(key);
    }
};
exports.LoginAttemptTrackerService = LoginAttemptTrackerService;
exports.LoginAttemptTrackerService = LoginAttemptTrackerService = __decorate([
    (0, common_1.Injectable)()
], LoginAttemptTrackerService);
//# sourceMappingURL=login-attempt-tracker.service.js.map