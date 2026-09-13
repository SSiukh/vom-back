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
exports.CreateSenderDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const verify_sender_dto_1 = require("./verify-sender.dto");
class CreateSenderDto extends verify_sender_dto_1.VerifySenderDto {
    cityRef;
    warehouseRef;
}
exports.CreateSenderDto = CreateSenderDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Ref населеного пункту відправки з довідника Нової Пошти. ' +
            'Опціонально при створенні — можна додати пізніше через ' +
            'PATCH /senders/:id/warehouse, але тоді warehouseRef теж має ' +
            'бути відсутнім',
    }),
    (0, class_validator_1.ValidateIf)((dto) => dto.warehouseRef !== undefined),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSenderDto.prototype, "cityRef", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Ref відділення відправки з довідника Нової Пошти. Опціонально ' +
            'при створенні — можна додати пізніше через ' +
            'PATCH /senders/:id/warehouse, але тоді cityRef теж має бути ' +
            'відсутнім',
    }),
    (0, class_validator_1.ValidateIf)((dto) => dto.cityRef !== undefined),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSenderDto.prototype, "warehouseRef", void 0);
//# sourceMappingURL=create-sender.dto.js.map