import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderTypeDto } from './dto/order-type.dto';
import { ShipmentTypeDto } from './dto/shipment-type.dto';
import { ProductTypeDto } from './dto/product-type.dto';
import { PaymentTypeDto } from './dto/payment-type.dto';
import { ExpenseTypeDto } from './dto/expense-type.dto';
import { DeliveryTypeDto } from './dto/delivery-type.dto';
import { ShipmentStatusDto } from './dto/shipment-status.dto';
import { OrderType } from './entities/order-type.entity';
import { ShipmentType } from './entities/shipment-type.entity';
import { ProductType } from './entities/product-type.entity';
import { PaymentType } from './entities/payment-type.entity';
import { ExpenseType } from './entities/expense-type.entity';
import { DeliveryType } from './entities/delivery-type.entity';
import { ShipmentStatus } from './entities/shipment-status.entity';

@Injectable()
export class DictionariesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrderTypes(): Promise<OrderTypeDto[]> {
    const orderTypes: OrderType[] = await this.prisma.orderType.findMany({
      orderBy: { label: 'asc' },
    });

    return orderTypes.map((type) => ({
      id: type.id,
      code: type.code,
      label: type.label,
    }));
  }

  async findShipmentTypes(): Promise<ShipmentTypeDto[]> {
    const shipmentTypes: ShipmentType[] =
      await this.prisma.shipmentType.findMany({
        orderBy: { label: 'asc' },
      });

    return shipmentTypes.map((type) => ({
      id: type.id,
      code: type.code,
      label: type.label,
      isDefault: type.isDefault,
    }));
  }

  async findProductTypes(): Promise<ProductTypeDto[]> {
    const productTypes: ProductType[] = await this.prisma.productType.findMany({
      orderBy: { label: 'asc' },
    });

    return productTypes.map((type) => ({
      id: type.id,
      code: type.code,
      label: type.label,
      isCustom: type.isCustom,
    }));
  }

  async findPaymentTypes(): Promise<PaymentTypeDto[]> {
    const paymentTypes: PaymentType[] = await this.prisma.paymentType.findMany({
      orderBy: { label: 'asc' },
    });

    return paymentTypes.map((type) => ({
      id: type.id,
      code: type.code,
      label: type.label,
    }));
  }

  async findExpenseTypes(): Promise<ExpenseTypeDto[]> {
    const expenseTypes: ExpenseType[] = await this.prisma.expenseType.findMany({
      orderBy: { label: 'asc' },
    });

    return expenseTypes.map((type) => ({
      id: type.id,
      code: type.code,
      label: type.label,
      requiresName: type.requiresName,
    }));
  }

  async findDeliveryTypes(): Promise<DeliveryTypeDto[]> {
    const deliveryTypes: DeliveryType[] =
      await this.prisma.deliveryType.findMany({
        orderBy: { label: 'asc' },
      });

    return deliveryTypes.map((type) => ({
      id: type.id,
      code: type.code,
      label: type.label,
    }));
  }

  async findShipmentStatuses(): Promise<ShipmentStatusDto[]> {
    const shipmentStatuses: ShipmentStatus[] =
      await this.prisma.shipmentStatus.findMany({
        orderBy: { label: 'asc' },
      });

    return shipmentStatuses.map((status) => ({
      id: status.id,
      code: status.code,
      label: status.label,
    }));
  }
}
