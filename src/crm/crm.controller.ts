import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { ListCrmQueryDto } from './dto/list-crm-query.dto';
import { ListCrmResponseDto } from './dto/list-crm-response.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

@ApiTags('crm')
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('table')
  findTable(@Query() query: ListCrmQueryDto): Promise<ListCrmResponseDto> {
    return this.crmService.findTable(
      query.page ?? DEFAULT_PAGE,
      query.pageSize ?? DEFAULT_PAGE_SIZE,
      query,
    );
  }
}
