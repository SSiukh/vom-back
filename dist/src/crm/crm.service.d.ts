import { PrismaService } from '../prisma/prisma.service';
import { ListCrmQueryDto } from './dto/list-crm-query.dto';
import { ListCrmResponseDto } from './dto/list-crm-response.dto';
export declare class CrmService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findTable(page: number, pageSize: number, query: ListCrmQueryDto): Promise<ListCrmResponseDto>;
    private toRowDto;
}
