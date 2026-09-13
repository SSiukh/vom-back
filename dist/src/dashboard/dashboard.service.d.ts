import { PrismaService } from '../prisma/prisma.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSummary(dateFrom?: string, dateTo?: string, brand?: 'vom' | 'm'): Promise<DashboardResponseDto>;
    private groupRevenueByDay;
}
