"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const two_fa_service_1 = require("./two-fa.service");
const login_dto_1 = require("./dto/login.dto");
const verify_login_dto_1 = require("./dto/verify-login.dto");
const refresh_dto_1 = require("./dto/refresh.dto");
const confirm_two_fa_dto_1 = require("./dto/confirm-two-fa.dto");
const public_decorator_1 = require("./decorators/public.decorator");
const skip_two_fa_gate_decorator_1 = require("./decorators/skip-two-fa-gate.decorator");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const AUTH_THROTTLE_TTL_MS = 60_000;
const AUTH_THROTTLE_LIMIT = 10;
let AuthController = class AuthController {
    authService;
    twoFaService;
    constructor(authService, twoFaService) {
        this.authService = authService;
        this.twoFaService = twoFaService;
    }
    login(dto) {
        return this.authService.login(dto);
    }
    verifyLogin(dto) {
        return this.authService.verifyLogin(dto);
    }
    refresh(dto) {
        return this.authService.refresh(dto);
    }
    async logout(user) {
        await this.authService.logout(user.id);
    }
    setupTwoFa(user) {
        return this.twoFaService.setup(user.id);
    }
    confirmTwoFa(user, dto) {
        return this.twoFaService.confirm(user.id, dto);
    }
    getTwoFaStatus(user) {
        return this.twoFaService.getStatus(user.id);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({
        default: { limit: AUTH_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL_MS },
    }),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({
        default: { limit: AUTH_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL_MS },
    }),
    (0, common_1.Post)('2fa/verify-login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_login_dto_1.VerifyLoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyLogin", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({
        default: { limit: AUTH_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL_MS },
    }),
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_dto_1.RefreshDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, skip_two_fa_gate_decorator_1.SkipTwoFaGate)(),
    (0, common_1.Post)('2fa/setup'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "setupTwoFa", null);
__decorate([
    (0, skip_two_fa_gate_decorator_1.SkipTwoFaGate)(),
    (0, common_1.Post)('2fa/confirm'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, confirm_two_fa_dto_1.ConfirmTwoFaDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "confirmTwoFa", null);
__decorate([
    (0, skip_two_fa_gate_decorator_1.SkipTwoFaGate)(),
    (0, common_1.Get)('2fa/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getTwoFaStatus", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        two_fa_service_1.TwoFaService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map