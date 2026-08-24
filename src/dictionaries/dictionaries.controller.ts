import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DictionariesService } from './dictionaries.service';
import { ShipmentTypeDto } from './dto/shipment-type.dto';
import { ProductTypeDto } from './dto/product-type.dto';
import { PaymentTypeDto } from './dto/payment-type.dto';
import { ExpenseTypeDto } from './dto/expense-type.dto';
import { DeliveryTypeDto } from './dto/delivery-type.dto';
import { ShipmentStatusDto } from './dto/shipment-status.dto';

@ApiTags('dictionaries')
@Controller('dictionaries')
export class DictionariesController {
  constructor(private readonly dictionariesService: DictionariesService) {}

  @Get('shipment-types')
  findShipmentTypes(): Promise<ShipmentTypeDto[]> {
    return this.dictionariesService.findShipmentTypes();
  }

  @Get('product-types')
  findProductTypes(): Promise<ProductTypeDto[]> {
    return this.dictionariesService.findProductTypes();
  }

  @Get('payment-types')
  findPaymentTypes(): Promise<PaymentTypeDto[]> {
    return this.dictionariesService.findPaymentTypes();
  }

  @Get('expense-types')
  findExpenseTypes(): Promise<ExpenseTypeDto[]> {
    return this.dictionariesService.findExpenseTypes();
  }

  @Get('delivery-types')
  findDeliveryTypes(): Promise<DeliveryTypeDto[]> {
    return this.dictionariesService.findDeliveryTypes();
  }

  @Get('shipment-statuses')
  findShipmentStatuses(): Promise<ShipmentStatusDto[]> {
    return this.dictionariesService.findShipmentStatuses();
  }
}
