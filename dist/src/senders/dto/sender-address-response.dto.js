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
exports.SenderAddressResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class SenderAddressResponseDto {
    npAddressRef;
    description;
}
exports.SenderAddressResponseDto = SenderAddressResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ref адреси в системі Нової Пошти' }),
    __metadata("design:type", String)
], SenderAddressResponseDto.prototype, "npAddressRef", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Опис адреси для відображення в селекті' }),
    __metadata("design:type", String)
], SenderAddressResponseDto.prototype, "description", void 0);
//# sourceMappingURL=sender-address-response.dto.js.map