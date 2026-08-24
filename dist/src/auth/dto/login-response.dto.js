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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class LoginResponseDto {
    requiresTwoFa;
    pendingToken;
    accessToken;
    refreshToken;
}
exports.LoginResponseDto = LoginResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'true, якщо потрібне підтвердження 2FA-кодом через /auth/2fa/verify-login',
    }),
    __metadata("design:type", Boolean)
], LoginResponseDto.prototype, "requiresTwoFa", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Короткоживучий токен для /auth/2fa/verify-login — присутній лише якщо requiresTwoFa=true',
    }),
    __metadata("design:type", String)
], LoginResponseDto.prototype, "pendingToken", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Присутній лише якщо requiresTwoFa=false',
    }),
    __metadata("design:type", String)
], LoginResponseDto.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Присутній лише якщо requiresTwoFa=false',
    }),
    __metadata("design:type", String)
], LoginResponseDto.prototype, "refreshToken", void 0);
//# sourceMappingURL=login-response.dto.js.map