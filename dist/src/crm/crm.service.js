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
exports.CrmService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const DEFAULT_SORT_ORDER = 'desc';
let CrmService = class CrmService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findTable(page, pageSize, query) {
        const where = {
            ...((query.dateFrom || query.dateTo) && {
                createdAt: {
                    ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
                    ...(query.dateTo && { lte: new Date(query.dateTo) }),
                },
            }),
            ...(query.productTypeId && {
                items: { some: { productTypeId: query.productTypeId } },
            }),
            ...(query.shipmentStatusId && {
                shipmentStatusId: query.shipmentStatusId,
            }),
        };
        const [orders, aggregate] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: query.sortOrder ?? DEFAULT_SORT_ORDER },
            }),
            this.prisma.order.aggregate({
                where,
                _sum: { totalAmount: true },
                _count: { _all: true },
            }),
        ]);
        return {
            items: orders.map((order) => this.toRowDto(order)),
            total: aggregate._count._all,
            totalAmountSum: aggregate._sum.totalAmount ?? 0,
        };
    }
    toRowDto(order) {
        const recipientFullName = [
            order.recipient.lastName,
            order.recipient.firstName,
            order.recipient.middleName,
        ]
            .filter(Boolean)
            .join(' ');
        const productTypeIds = [
            ...new Set(order.items.map((item) => item.productTypeId)),
        ];
        return {
            id: order.id,
            createdAt: order.createdAt,
            npWaybillNumber: order.npWaybillNumber,
            paymentTypeId: order.paymentTypeId,
            recipientFullName,
            recipientPhone: order.recipient.phone,
            totalAmount: order.totalAmount,
            shipmentStatusId: order.shipmentStatusId,
            productTypeIds,
        };
    }
};
exports.CrmService = CrmService;
exports.CrmService = CrmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmService);
//# sourceMappingURL=crm.service.js.map