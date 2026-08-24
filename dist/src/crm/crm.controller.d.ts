import { CrmService } from './crm.service';
import { ListCrmQueryDto } from './dto/list-crm-query.dto';
import { ListCrmResponseDto } from './dto/list-crm-response.dto';
export declare class CrmController {
    private readonly crmService;
    constructor(crmService: CrmService);
    findTable(query: ListCrmQueryDto): Promise<ListCrmResponseDto>;
}
