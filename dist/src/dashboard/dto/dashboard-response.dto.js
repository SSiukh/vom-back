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
exports.DashboardResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const revenue_by_day_dto_1 = require("./revenue-by-day.dto");
const expense_category_breakdown_dto_1 = require("./expense-category-breakdown.dto");
const shipment_status_breakdown_dto_1 = require("./shipment-status-breakdown.dto");
class DashboardResponseDto {
    totalRevenue;
    totalExpenses;
    profit;
    orderCount;
    revenueByDay;
    expensesByCategory;
    shipmentStatusBreakdown;
}
exports.DashboardResponseDto = DashboardResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Сумарна вартість всіх замовлень за період' }),
    __metadata("design:type", Number)
], DashboardResponseDto.prototype, "totalRevenue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Сумарна вартість всіх витрат за період' }),
    __metadata("design:type", Number)
], DashboardResponseDto.prototype, "totalExpenses", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'totalRevenue - totalExpenses' }),
    __metadata("design:type", Number)
], DashboardResponseDto.prototype, "profit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Кількість замовлень за період' }),
    __metadata("design:type", Number)
], DashboardResponseDto.prototype, "orderCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [revenue_by_day_dto_1.RevenueByDayDto] }),
    __metadata("design:type", Array)
], DashboardResponseDto.prototype, "revenueByDay", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [expense_category_breakdown_dto_1.ExpenseCategoryBreakdownDto] }),
    __metadata("design:type", Array)
], DashboardResponseDto.prototype, "expensesByCategory", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [shipment_status_breakdown_dto_1.ShipmentStatusBreakdownDto] }),
    __metadata("design:type", Array)
], DashboardResponseDto.prototype, "shipmentStatusBreakdown", void 0);
//# sourceMappingURL=dashboard-response.dto.js.map