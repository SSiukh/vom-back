import { RevenueByDayDto } from './revenue-by-day.dto';
import { ExpenseCategoryBreakdownDto } from './expense-category-breakdown.dto';
import { ShipmentStatusBreakdownDto } from './shipment-status-breakdown.dto';
export declare class DashboardResponseDto {
    totalRevenue: number;
    totalExpenses: number;
    profit: number;
    orderCount: number;
    revenueByDay: RevenueByDayDto[];
    expensesByCategory: ExpenseCategoryBreakdownDto[];
    shipmentStatusBreakdown: ShipmentStatusBreakdownDto[];
}
