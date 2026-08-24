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
exports.DictionariesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const dictionaries_service_1 = require("./dictionaries.service");
let DictionariesController = class DictionariesController {
    dictionariesService;
    constructor(dictionariesService) {
        this.dictionariesService = dictionariesService;
    }
    findOrderTypes() {
        return this.dictionariesService.findOrderTypes();
    }
    findShipmentTypes() {
        return this.dictionariesService.findShipmentTypes();
    }
    findProductTypes() {
        return this.dictionariesService.findProductTypes();
    }
    findPaymentTypes() {
        return this.dictionariesService.findPaymentTypes();
    }
    findExpenseTypes() {
        return this.dictionariesService.findExpenseTypes();
    }
    findDeliveryTypes() {
        return this.dictionariesService.findDeliveryTypes();
    }
    findShipmentStatuses() {
        return this.dictionariesService.findShipmentStatuses();
    }
};
exports.DictionariesController = DictionariesController;
__decorate([
    (0, common_1.Get)('order-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DictionariesController.prototype, "findOrderTypes", null);
__decorate([
    (0, common_1.Get)('shipment-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DictionariesController.prototype, "findShipmentTypes", null);
__decorate([
    (0, common_1.Get)('product-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DictionariesController.prototype, "findProductTypes", null);
__decorate([
    (0, common_1.Get)('payment-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DictionariesController.prototype, "findPaymentTypes", null);
__decorate([
    (0, common_1.Get)('expense-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DictionariesController.prototype, "findExpenseTypes", null);
__decorate([
    (0, common_1.Get)('delivery-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DictionariesController.prototype, "findDeliveryTypes", null);
__decorate([
    (0, common_1.Get)('shipment-statuses'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DictionariesController.prototype, "findShipmentStatuses", null);
exports.DictionariesController = DictionariesController = __decorate([
    (0, swagger_1.ApiTags)('dictionaries'),
    (0, common_1.Controller)('dictionaries'),
    __metadata("design:paramtypes", [dictionaries_service_1.DictionariesService])
], DictionariesController);
//# sourceMappingURL=dictionaries.controller.js.map