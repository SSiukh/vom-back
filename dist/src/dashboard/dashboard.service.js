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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const kyiv_time_1 = require("../shared/utils/kyiv-time");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary(dateFrom, dateTo, brand) {
        const createdAtFilter = dateFrom || dateTo
            ? {
                ...(dateFrom && { gte: (0, kyiv_time_1.parseRangeStart)(dateFrom) }),
                ...(dateTo && { lte: (0, kyiv_time_1.parseRangeEnd)(dateTo) }),
            }
            : undefined;
        const periodWhere = createdAtFilter ? { createdAt: createdAtFilter } : {};
        const typeIds = brand
            ? (await this.prisma.productType.findMany({
                where: { brand },
                select: { id: true },
            })).map((type) => type.id)
            : undefined;
        const orderWhere = typeIds
            ? { ...periodWhere, items: { some: { productTypeId: { in: typeIds } } } }
            : periodWhere;
        const expenseWhere = brand ? { ...periodWhere, brand } : periodWhere;
        const [orders, expenses, expenseTypes, shipmentStatuses, sharedExpenses] = await Promise.all([
            this.prisma.order.findMany({
                where: orderWhere,
                select: {
                    createdAt: true,
                    totalAmount: true,
                    shipmentStatusId: true,
                    items: true,
                },
            }),
            this.prisma.expense.findMany({
                where: expenseWhere,
                select: { typeId: true, amount: true },
            }),
            this.prisma.expenseType.findMany(),
            this.prisma.shipmentStatus.findMany(),
            brand
                ? this.prisma.expense
                    .aggregate({
                    where: {
                        ...periodWhere,
                        OR: [{ brand: null }, { brand: { isSet: false } }],
                    },
                    _sum: { amount: true },
                })
                    .then((result) => result._sum.amount ?? 0)
                : Promise.resolve(null),
        ]);
        const revenueOf = (order) => typeIds
            ? order.items
                .filter((item) => typeIds.includes(item.productTypeId))
                .reduce((sum, item) => sum + item.subtotal, 0)
            : order.totalAmount;
        const totalRevenue = orders.reduce((sum, order) => sum + revenueOf(order), 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const statusCodeById = new Map(shipmentStatuses.map((status) => [status.id, status.code]));
        let realizedRevenue = 0;
        let pendingRevenue = 0;
        let lostRevenue = 0;
        for (const order of orders) {
            const code = order.shipmentStatusId
                ? statusCodeById.get(order.shipmentStatusId)
                : undefined;
            const revenue = revenueOf(order);
            if (code === 'received') {
                realizedRevenue += revenue;
            }
            else if (code === 'refused') {
                lostRevenue += revenue;
            }
            else {
                pendingRevenue += revenue;
            }
        }
        const revenueByDay = this.groupRevenueByDay(orders, revenueOf);
        const expensesByCategory = expenseTypes.map((type) => ({
            expenseTypeId: type.id,
            label: type.label,
            amount: expenses
                .filter((expense) => expense.typeId === type.id)
                .reduce((sum, expense) => sum + expense.amount, 0),
        }));
        const shipmentStatusBreakdown = shipmentStatuses.map((status) => ({
            shipmentStatusId: status.id,
            label: status.label,
            count: orders.filter((order) => order.shipmentStatusId === status.id)
                .length,
        }));
        return {
            totalRevenue,
            totalExpenses,
            profit: realizedRevenue - totalExpenses,
            realizedRevenue,
            pendingRevenue,
            lostRevenue,
            orderCount: orders.length,
            sharedExpenses,
            revenueByDay,
            expensesByCategory,
            shipmentStatusBreakdown,
        };
    }
    groupRevenueByDay(orders, revenueOf) {
        const revenueByDayMap = new Map();
        for (const order of orders) {
            const day = (0, kyiv_time_1.kyivDayKey)(order.createdAt);
            revenueByDayMap.set(day, (revenueByDayMap.get(day) ?? 0) + revenueOf(order));
        }
        return [...revenueByDayMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, revenue]) => ({ date, revenue }));
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map