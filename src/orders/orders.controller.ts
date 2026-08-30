import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { SetOrderStatusFlagsDto } from './dto/set-order-status-flags.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { BulkSyncStatusResponseDto } from './dto/bulk-sync-status-response.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { ListOrdersResponseDto } from './dto/list-orders-response.dto';
import { ParseObjectIdPipe } from '../shared/pipes/parse-object-id.pipe';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const NOVA_POSHTA_CALL_THROTTLE_TTL_MS = 60_000;
const NOVA_POSHTA_CALL_THROTTLE_LIMIT = 20;

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Throttle({
    default: {
      limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
      ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
    },
  })
  @Post()
  create(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.ordersService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListOrdersQueryDto): Promise<ListOrdersResponseDto> {
    return this.ordersService.findAll(
      query.page ?? DEFAULT_PAGE,
      query.pageSize ?? DEFAULT_PAGE_SIZE,
      query.dateFrom,
      query.dateTo,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.findOne(id);
  }

  @Throttle({
    default: {
      limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
      ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
    },
  })
  @Patch('sync-statuses')
  syncAllStatuses(): Promise<BulkSyncStatusResponseDto> {
    return this.ordersService.syncAllStatuses();
  }

  @Throttle({
    default: {
      limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
      ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
    },
  })
  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.update(id, dto);
  }

  @Throttle({
    default: {
      limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
      ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
    },
  })
  @Patch(':id/sync-status')
  syncStatus(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.syncStatus(id);
  }

  @Patch(':id/status-flags')
  setStatusFlags(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: SetOrderStatusFlagsDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.setStatusFlags(id, dto);
  }

  @Throttle({
    default: {
      limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
      ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
    },
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.ordersService.remove(id);
  }
}
