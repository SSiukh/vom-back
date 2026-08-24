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
exports.DictionariesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DictionariesService = class DictionariesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findOrderTypes() {
        const orderTypes = await this.prisma.orderType.findMany({
            orderBy: { label: 'asc' },
        });
        return orderTypes.map((type) => ({
            id: type.id,
            code: type.code,
            label: type.label,
        }));
    }
    async findShipmentTypes() {
        const shipmentTypes = await this.prisma.shipmentType.findMany({
            orderBy: { label: 'asc' },
        });
        return shipmentTypes.map((type) => ({
            id: type.id,
            code: type.code,
            label: type.label,
            isDefault: type.isDefault,
        }));
    }
    async findProductTypes() {
        const productTypes = await this.prisma.productType.findMany({
            orderBy: { label: 'asc' },
        });
        return productTypes.map((type) => ({
            id: type.id,
            code: type.code,
            label: type.label,
            isCustom: type.isCustom,
        }));
    }
    async findPaymentTypes() {
        const paymentTypes = await this.prisma.paymentType.findMany({
            orderBy: { label: 'asc' },
        });
        return paymentTypes.map((type) => ({
            id: type.id,
            code: type.code,
            label: type.label,
        }));
    }
    async findExpenseTypes() {
        const expenseTypes = await this.prisma.expenseType.findMany({
            orderBy: { label: 'asc' },
        });
        return expenseTypes.map((type) => ({
            id: type.id,
            code: type.code,
            label: type.label,
            requiresName: type.requiresName,
        }));
    }
    async findDeliveryTypes() {
        const deliveryTypes = await this.prisma.deliveryType.findMany({
            orderBy: { label: 'asc' },
        });
        return deliveryTypes.map((type) => ({
            id: type.id,
            code: type.code,
            label: type.label,
        }));
    }
    async findShipmentStatuses() {
        const shipmentStatuses = await this.prisma.shipmentStatus.findMany({
            orderBy: { label: 'asc' },
        });
        return shipmentStatuses.map((status) => ({
            id: status.id,
            code: status.code,
            label: status.label,
        }));
    }
};
exports.DictionariesService = DictionariesService;
exports.DictionariesService = DictionariesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DictionariesService);
//# sourceMappingURL=dictionaries.service.js.map