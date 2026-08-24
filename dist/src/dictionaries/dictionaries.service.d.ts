import { PrismaService } from '../prisma/prisma.service';
import { ShipmentTypeDto } from './dto/shipment-type.dto';
import { ProductTypeDto } from './dto/product-type.dto';
import { PaymentTypeDto } from './dto/payment-type.dto';
import { ExpenseTypeDto } from './dto/expense-type.dto';
import { DeliveryTypeDto } from './dto/delivery-type.dto';
import { ShipmentStatusDto } from './dto/shipment-status.dto';
export declare class DictionariesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findShipmentTypes(): Promise<ShipmentTypeDto[]>;
    findProductTypes(): Promise<ProductTypeDto[]>;
    findPaymentTypes(): Promise<PaymentTypeDto[]>;
    findExpenseTypes(): Promise<ExpenseTypeDto[]>;
    findDeliveryTypes(): Promise<DeliveryTypeDto[]>;
    findShipmentStatuses(): Promise<ShipmentStatusDto[]>;
}
