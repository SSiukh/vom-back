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
exports.CreateOrderDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const order_item_dto_1 = require("./order-item.dto");
const recipient_dto_1 = require("./recipient.dto");
const delivery_details_dto_1 = require("./delivery-details.dto");
class CreateOrderDto {
    orderTypeId;
    shipmentTypeId;
    paymentTypeId;
    partialAmount;
    items;
    senderId;
    senderAddressRef;
    recipient;
    deliveryTypeId;
    deliveryDetails;
}
exports.CreateOrderDto = CreateOrderDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ref довідника order_types' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "orderTypeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ref довідника shipment_types' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "shipmentTypeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ref довідника payment_types' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "paymentTypeId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Сума післяплати — обов’язкова, якщо тип оплати "часткова оплата"',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "partialAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [order_item_dto_1.OrderItemDto] }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => order_item_dto_1.OrderItemDto),
    (0, class_validator_1.ArrayMinSize)(1),
    __metadata("design:type", Array)
], CreateOrderDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Відправник, від імені якого створюється замовлення',
    }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "senderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Ref обраної адреси відправки цього відправника',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "senderAddressRef", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: recipient_dto_1.RecipientDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => recipient_dto_1.RecipientDto),
    __metadata("design:type", recipient_dto_1.RecipientDto)
], CreateOrderDto.prototype, "recipient", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ref довідника delivery_types' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "deliveryTypeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: delivery_details_dto_1.DeliveryDetailsDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => delivery_details_dto_1.DeliveryDetailsDto),
    __metadata("design:type", delivery_details_dto_1.DeliveryDetailsDto)
], CreateOrderDto.prototype, "deliveryDetails", void 0);
//# sourceMappingURL=create-order.dto.js.map