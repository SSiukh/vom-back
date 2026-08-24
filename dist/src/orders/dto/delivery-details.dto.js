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
exports.DeliveryDetailsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class DeliveryDetailsDto {
    cityRef;
    warehouseRef;
    streetRef;
    house;
    apartment;
    postomatRef;
}
exports.DeliveryDetailsDto = DeliveryDetailsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ref населеного пункту з довідника Нової Пошти' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DeliveryDetailsDto.prototype, "cityRef", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Ref відділення — обов’язковий, якщо спосіб доставки "Відділення"',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DeliveryDetailsDto.prototype, "warehouseRef", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Ref вулиці — обов’язковий, якщо спосіб доставки "Адреса"',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DeliveryDetailsDto.prototype, "streetRef", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Номер будинку — обов’язковий, якщо спосіб доставки "Адреса"',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DeliveryDetailsDto.prototype, "house", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Номер квартири, не обов’язково' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DeliveryDetailsDto.prototype, "apartment", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Ref поштомату — обов’язковий, якщо спосіб доставки "Поштомат"',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DeliveryDetailsDto.prototype, "postomatRef", void 0);
//# sourceMappingURL=delivery-details.dto.js.map