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
exports.OrderResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const order_item_response_dto_1 = require("./order-item-response.dto");
const recipient_response_dto_1 = require("./recipient-response.dto");
const delivery_details_response_dto_1 = require("./delivery-details-response.dto");
class OrderResponseDto {
    id;
    shipmentTypeId;
    paymentTypeId;
    partialAmount;
    totalAmount;
    items;
    senderId;
    senderAddressRef;
    recipient;
    deliveryTypeId;
    deliveryDetails;
    npWaybillNumber;
    npWaybillRef;
    shipmentStatusId;
    isPacked;
    isOutOfStock;
    createdAt;
    updatedAt;
}
exports.OrderResponseDto = OrderResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OrderResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OrderResponseDto.prototype, "shipmentTypeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OrderResponseDto.prototype, "paymentTypeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], OrderResponseDto.prototype, "partialAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], OrderResponseDto.prototype, "totalAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [order_item_response_dto_1.OrderItemResponseDto] }),
    __metadata("design:type", Array)
], OrderResponseDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OrderResponseDto.prototype, "senderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OrderResponseDto.prototype, "senderAddressRef", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: recipient_response_dto_1.RecipientResponseDto }),
    __metadata("design:type", recipient_response_dto_1.RecipientResponseDto)
], OrderResponseDto.prototype, "recipient", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OrderResponseDto.prototype, "deliveryTypeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: delivery_details_response_dto_1.DeliveryDetailsResponseDto }),
    __metadata("design:type", delivery_details_response_dto_1.DeliveryDetailsResponseDto)
], OrderResponseDto.prototype, "deliveryDetails", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], OrderResponseDto.prototype, "npWaybillNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], OrderResponseDto.prototype, "npWaybillRef", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], OrderResponseDto.prototype, "shipmentStatusId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Позначка "Спаковано"' }),
    __metadata("design:type", Boolean)
], OrderResponseDto.prototype, "isPacked", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Позначка "Відсутній товар"' }),
    __metadata("design:type", Boolean)
], OrderResponseDto.prototype, "isOutOfStock", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], OrderResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], OrderResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=order-response.dto.js.map