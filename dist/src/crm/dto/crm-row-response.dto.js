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
exports.CrmRowResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class CrmRowResponseDto {
    id;
    createdAt;
    npWaybillNumber;
    paymentTypeId;
    recipientFullName;
    recipientPhone;
    totalAmount;
    shipmentStatusId;
    productTypeIds;
}
exports.CrmRowResponseDto = CrmRowResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CrmRowResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], CrmRowResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], CrmRowResponseDto.prototype, "npWaybillNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CrmRowResponseDto.prototype, "paymentTypeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ПІБ отримувача' }),
    __metadata("design:type", String)
], CrmRowResponseDto.prototype, "recipientFullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CrmRowResponseDto.prototype, "recipientPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CrmRowResponseDto.prototype, "totalAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], CrmRowResponseDto.prototype, "shipmentStatusId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [String],
        description: 'Унікальні ref-и product_types серед позицій замовлення',
    }),
    __metadata("design:type", Array)
], CrmRowResponseDto.prototype, "productTypeIds", void 0);
//# sourceMappingURL=crm-row-response.dto.js.map