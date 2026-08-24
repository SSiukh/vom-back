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
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary(dateFrom, dateTo) {
        const createdAtFilter = dateFrom || dateTo
            ? {
                ...(dateFrom && { gte: new Date(dateFrom) }),
                ...(dateTo && { lte: new Date(dateTo) }),
            }
            : undefined;
        const periodWhere = createdAtFilter ? { createdAt: createdAtFilter } : {};
        const [orders, expenses, expenseTypes, shipmentStatuses] = await Promise.all([
            this.prisma.order.findMany({
                where: periodWhere,
                select: { createdAt: true, totalAmount: true, shipmentStatusId: true },
            }),
            this.prisma.expense.findMany({
                where: periodWhere,
                select: { typeId: true, amount: true },
            }),
            this.prisma.expenseType.findMany(),
            this.prisma.shipmentStatus.findMany(),
        ]);
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const revenueByDay = this.groupRevenueByDay(orders);
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
            profit: totalRevenue - totalExpenses,
            orderCount: orders.length,
            revenueByDay,
            expensesByCategory,
            shipmentStatusBreakdown,
        };
    }
    groupRevenueByDay(orders) {
        const revenueByDayMap = new Map();
        for (const order of orders) {
            const day = order.createdAt.toISOString().slice(0, 10);
            revenueByDayMap.set(day, (revenueByDayMap.get(day) ?? 0) + order.totalAmount);
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