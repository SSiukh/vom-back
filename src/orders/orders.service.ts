import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import {
  NovaPoshtaService,
  UpdateWaybillParams,
} from '../nova-poshta/nova-poshta.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { SetOrderStatusFlagsDto } from './dto/set-order-status-flags.dto';
import { BulkSyncStatusResponseDto } from './dto/bulk-sync-status-response.dto';
import { OrderItemDto } from './dto/order-item.dto';
import { DeliveryDetailsDto } from './dto/delivery-details.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { ListOrdersResponseDto } from './dto/list-orders-response.dto';
import { Order, OrderItem } from './entities/order.entity';

const MAX_DESCRIPTION_LENGTH = 200;

interface ResolvedItems {
  items: OrderItem[];
  totalAmount: number;
  stockDecrements: { productId: string; quantity: number }[];
  willBeOutOfStock: boolean;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly novaPoshta: NovaPoshtaService,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderResponseDto> {
    const [shipmentType, paymentType, deliveryType] = await Promise.all([
      this.prisma.shipmentType.findUnique({
        where: { id: dto.shipmentTypeId },
      }),
      this.prisma.paymentType.findUnique({
        where: { id: dto.paymentTypeId },
      }),
      this.prisma.deliveryType.findUnique({
        where: { id: dto.deliveryTypeId },
      }),
    ]);

    if (!shipmentType) {
      throw new BadRequestException('Unknown shipment type');
    }
    if (!paymentType) {
      throw new BadRequestException('Unknown payment type');
    }
    if (!deliveryType) {
      throw new BadRequestException('Unknown delivery type');
    }

    if (paymentType.code === 'partial' && dto.partialAmount === undefined) {
      throw new BadRequestException(
        'partialAmount is required for the "часткова оплата" payment type',
      );
    }

    if (deliveryType.code === 'address') {
      throw new BadRequestException(
        'Door-to-door ("Адреса") delivery is not supported yet — its Nova Poshta request shape has not been verified. Use "Відділення" or "Поштомат" for now.',
      );
    }

    this.validateDeliveryDetails(deliveryType.code, dto.deliveryDetails);
    const recipientAddressRef =
      deliveryType.code === 'postomat'
        ? dto.deliveryDetails.postomatRef
        : dto.deliveryDetails.warehouseRef;
    if (!recipientAddressRef) {
      throw new BadRequestException(
        'Missing warehouse/postomat ref for the selected delivery type',
      );
    }

    const sender = await this.prisma.sender.findFirst({
      where: { id: dto.senderId, isDeactivated: false },
    });
    if (!sender) {
      throw new BadRequestException('Sender not found or deactivated');
    }

    const senderAddress = sender.addresses.find(
      (address) =>
        address.npAddressRef === dto.senderAddressRef && !address.isDeactivated,
    );
    if (!senderAddress) {
      throw new BadRequestException('Sender address not found or deactivated');
    }

    const { items, totalAmount, stockDecrements, willBeOutOfStock } =
      await this.resolveItems(dto.items);

    if (paymentType.code === 'partial' && dto.partialAmount! > totalAmount) {
      throw new BadRequestException(
        'partialAmount cannot exceed the order total',
      );
    }

    const apiKey = this.encryption.decrypt(sender.apiKey);
    const recipientFullName = [
      dto.recipient.lastName,
      dto.recipient.firstName,
      dto.recipient.middleName,
    ]
      .filter(Boolean)
      .join(' ');

    const waybill = await this.novaPoshta.createWaybill(apiKey, {
      senderCounterpartyRef: sender.npCounterpartyRef,
      senderContactPersonRef: sender.npContactPersonRef,
      senderPhone: sender.phone,
      senderCityRef: senderAddress.cityRef,
      senderAddressRef: dto.senderAddressRef,
      cargoType: this.resolveCargoType(shipmentType.code),
      serviceType: 'WarehouseWarehouse',
      cost: totalAmount,
      codAmount: this.resolveCodAmount(
        paymentType.code,
        totalAmount,
        dto.partialAmount ?? null,
      ),
      description:
        shipmentType.code === 'documents'
          ? 'Документи'
          : this.buildWaybillDescription(items),
      recipientCityRef: dto.deliveryDetails.cityRef,
      recipientAddressRef,
      recipientName: recipientFullName,
      recipientPhone: dto.recipient.phone,
    });

    try {
      const [order] = await this.prisma.$transaction([
        this.prisma.order.create({
          data: {
            shipmentTypeId: dto.shipmentTypeId,
            paymentTypeId: dto.paymentTypeId,
            partialAmount: dto.partialAmount ?? null,
            totalAmount,
            items,
            senderId: dto.senderId,
            senderAddressRef: dto.senderAddressRef,
            recipient: {
              phone: dto.recipient.phone,
              lastName: dto.recipient.lastName,
              firstName: dto.recipient.firstName,
              middleName: dto.recipient.middleName ?? null,
            },
            deliveryTypeId: dto.deliveryTypeId,
            deliveryDetails: {
              cityRef: dto.deliveryDetails.cityRef,
              warehouseRef: dto.deliveryDetails.warehouseRef ?? null,
              streetRef: dto.deliveryDetails.streetRef ?? null,
              house: dto.deliveryDetails.house ?? null,
              apartment: dto.deliveryDetails.apartment ?? null,
              postomatRef: dto.deliveryDetails.postomatRef ?? null,
            },
            npWaybillNumber: waybill.waybillNumber,
            npWaybillRef: waybill.waybillRef,
            shipmentStatusId: null,
            isOutOfStock: willBeOutOfStock,
          },
        }),
        ...stockDecrements.map(({ productId, quantity }) =>
          this.prisma.product.update({
            where: { id: productId },
            data: { stockQuantity: { decrement: quantity } },
          }),
        ),
      ]);

      return this.toResponseDto(order);
    } catch (error) {
      await this.cleanupOrphanedWaybill(apiKey, waybill.waybillRef);

      if (this.isConcurrencyConflict(error)) {
        throw new BadRequestException(
          'A concurrent write conflicted with this order — please retry',
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateOrderDto): Promise<OrderResponseDto> {
    const order = await this.findOrThrow(id);

    const shipmentTypeId = dto.shipmentTypeId ?? order.shipmentTypeId;
    const paymentTypeId = dto.paymentTypeId ?? order.paymentTypeId;

    const [shipmentType, paymentType] = await Promise.all([
      this.prisma.shipmentType.findUnique({ where: { id: shipmentTypeId } }),
      this.prisma.paymentType.findUnique({ where: { id: paymentTypeId } }),
    ]);
    if (!shipmentType) {
      throw new BadRequestException('Unknown shipment type');
    }
    if (!paymentType) {
      throw new BadRequestException('Unknown payment type');
    }

    const partialAmount =
      dto.partialAmount !== undefined
        ? dto.partialAmount
        : (order.partialAmount ?? undefined);
    if (paymentType.code === 'partial' && partialAmount === undefined) {
      throw new BadRequestException(
        'partialAmount is required for the "часткова оплата" payment type',
      );
    }
    const resolvedPartialAmount =
      paymentType.code === 'partial' ? partialAmount! : null;

    const paymentTypeChanged = paymentTypeId !== order.paymentTypeId;
    const previousPaymentType = paymentTypeChanged
      ? await this.prisma.paymentType.findUnique({
          where: { id: order.paymentTypeId },
        })
      : paymentType;
    if (!previousPaymentType) {
      throw new BadRequestException(
        "This order's original payment type no longer exists — cannot safely compute a rollback value for the waybill",
      );
    }
    const previousCodAmount = this.resolveCodAmount(
      previousPaymentType.code,
      order.totalAmount,
      order.partialAmount,
    );

    const itemsChanged = dto.items !== undefined;
    const stockRestores = itemsChanged
      ? this.buildStockRestores(order.items)
      : [];

    let items = order.items;
    let totalAmount = order.totalAmount;
    let stockDecrements: { productId: string; quantity: number }[] = [];
    let willBeOutOfStock = false;

    if (dto.items) {
      const freedQuantityByProduct = new Map<string, number>();
      for (const restore of stockRestores) {
        freedQuantityByProduct.set(
          restore.productId,
          (freedQuantityByProduct.get(restore.productId) ?? 0) +
            restore.quantity,
        );
      }

      const resolved = await this.resolveItems(
        dto.items,
        freedQuantityByProduct,
      );
      items = resolved.items;
      totalAmount = resolved.totalAmount;
      stockDecrements = resolved.stockDecrements;
      willBeOutOfStock = resolved.willBeOutOfStock;
    }

    if (
      paymentType.code === 'partial' &&
      resolvedPartialAmount! > totalAmount
    ) {
      throw new BadRequestException(
        'partialAmount cannot exceed the order total',
      );
    }

    const codAmount = this.resolveCodAmount(
      paymentType.code,
      totalAmount,
      resolvedPartialAmount,
    );
    const codAmountChanged = codAmount !== previousCodAmount;

    const shipmentTypeChanged = shipmentTypeId !== order.shipmentTypeId;
    const waybillContentChanged =
      itemsChanged &&
      (totalAmount !== order.totalAmount ||
        this.buildWaybillDescription(items) !==
          this.buildWaybillDescription(order.items));
    const needsWaybillUpdate =
      order.npWaybillRef !== null &&
      (waybillContentChanged || shipmentTypeChanged || codAmountChanged);

    let waybillUpdateContext: {
      apiKey: string;
      baseParams: Omit<
        UpdateWaybillParams,
        'cargoType' | 'cost' | 'codAmount' | 'description'
      >;
      previousCargoType: string;
      previousCost: number;
      previousCodAmount: number | null;
      previousDescription: string;
    } | null = null;

    if (needsWaybillUpdate) {
      const sender = await this.prisma.sender.findUnique({
        where: { id: order.senderId },
      });
      if (!sender) {
        throw new BadRequestException('Sender for this order no longer exists');
      }
      const senderAddress = sender.addresses.find(
        (address) => address.npAddressRef === order.senderAddressRef,
      );
      if (!senderAddress) {
        throw new BadRequestException(
          'Sender address for this order no longer exists',
        );
      }
      const recipientAddressRef =
        order.deliveryDetails.warehouseRef ?? order.deliveryDetails.postomatRef;
      if (!recipientAddressRef) {
        throw new BadRequestException(
          'Order has no recorded warehouse/postomat ref to update the waybill against',
        );
      }

      const apiKey = this.encryption.decrypt(sender.apiKey);
      const baseParams = {
        waybillRef: order.npWaybillRef as string,
        senderCounterpartyRef: sender.npCounterpartyRef,
        senderContactPersonRef: sender.npContactPersonRef,
        senderPhone: sender.phone,
        senderCityRef: senderAddress.cityRef,
        senderAddressRef: order.senderAddressRef,
        serviceType: 'WarehouseWarehouse',
        recipientCityRef: order.deliveryDetails.cityRef,
        recipientAddressRef,
        recipientPhone: order.recipient.phone,
      };

      const previousShipmentType = shipmentTypeChanged
        ? await this.prisma.shipmentType.findUnique({
            where: { id: order.shipmentTypeId },
          })
        : shipmentType;
      if (!previousShipmentType) {
        throw new BadRequestException(
          "This order's original shipment type no longer exists — cannot safely compute a rollback value for the waybill",
        );
      }

      waybillUpdateContext = {
        apiKey,
        baseParams,
        previousCargoType: this.resolveCargoType(previousShipmentType.code),
        previousCost: order.totalAmount,
        previousCodAmount,
        previousDescription: this.buildWaybillDescription(order.items),
      };

      await this.novaPoshta.updateWaybill(apiKey, {
        ...baseParams,
        cargoType: this.resolveCargoType(shipmentType.code),
        cost: totalAmount,
        codAmount,
        description: this.buildWaybillDescription(items),
      });
    }

    try {
      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id, updatedAt: order.updatedAt },
          data: {
            shipmentTypeId,
            paymentTypeId,
            partialAmount: resolvedPartialAmount,
            totalAmount,
            items,
            ...(willBeOutOfStock && { isOutOfStock: true }),
          },
        }),
        ...stockRestores.map(({ productId, quantity }) =>
          this.prisma.product.update({
            where: { id: productId },
            data: { stockQuantity: { increment: quantity } },
          }),
        ),
        ...stockDecrements.map(({ productId, quantity }) =>
          this.prisma.product.update({
            where: { id: productId },
            data: { stockQuantity: { decrement: quantity } },
          }),
        ),
      ]);
    } catch (error) {
      if (waybillUpdateContext) {
        await this.cleanupFailedOrderUpdate(waybillUpdateContext);
      }

      if (this.isConcurrencyConflict(error)) {
        throw new BadRequestException(
          'This order was modified concurrently — please retry',
        );
      }
      throw error;
    }

    const updated = await this.findOrThrow(id);
    return this.toResponseDto(updated);
  }

  async findAll(
    page: number,
    pageSize: number,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ListOrdersResponseDto> {
    const where = {
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((order) => this.toResponseDto(order)),
      total,
    };
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const order = await this.findOrThrow(id);

    return this.toResponseDto(order);
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOrThrow(id);

    const stockRestores = this.buildStockRestores(order.items);

    await this.prisma.$transaction([
      this.prisma.order.delete({ where: { id } }),
      ...stockRestores.map(({ productId, quantity }) =>
        this.prisma.product.update({
          where: { id: productId },
          data: { stockQuantity: { increment: quantity } },
        }),
      ),
    ]);

    if (order.npWaybillRef) {
      await this.cleanupDeletedOrderWaybill(order.senderId, order.npWaybillRef);
    }
  }

  async syncStatus(id: string): Promise<OrderResponseDto> {
    const order = await this.findOrThrow(id);

    if (!order.npWaybillNumber) {
      throw new BadRequestException(
        'This order has no Nova Poshta waybill to sync a status from',
      );
    }

    const sender = await this.prisma.sender.findUnique({
      where: { id: order.senderId },
    });
    if (!sender) {
      throw new BadRequestException('Sender for this order no longer exists');
    }

    const apiKey = this.encryption.decrypt(sender.apiKey);
    const status = await this.novaPoshta.getShipmentStatus(
      apiKey,
      order.npWaybillNumber,
    );

    const shipmentStatus = await this.prisma.shipmentStatus.findFirst({
      where: { npStatusCodes: { has: status.statusCode } },
    });
    if (!shipmentStatus) {
      this.logger.warn(
        `Nova Poshta status code "${status.statusCode}" (${status.status}) for order ${id} does not map to any known shipment status — leaving it unchanged`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { shipmentStatusId: shipmentStatus?.id ?? order.shipmentStatusId },
    });

    return this.toResponseDto(updated);
  }

  async syncAllStatuses(): Promise<BulkSyncStatusResponseDto> {
    const orders = await this.prisma.order.findMany({
      where: { npWaybillNumber: { not: null } },
    });

    if (orders.length === 0) {
      return { totalOrders: 0, updatedCount: 0, unmappedCount: 0 };
    }

    const ordersBySender = new Map<string, Order[]>();
    for (const order of orders) {
      const existing = ordersBySender.get(order.senderId) ?? [];
      existing.push(order);
      ordersBySender.set(order.senderId, existing);
    }

    const shipmentStatuses = await this.prisma.shipmentStatus.findMany();

    let updatedCount = 0;
    let unmappedCount = 0;

    for (const [senderId, senderOrders] of ordersBySender) {
      const sender = await this.prisma.sender.findUnique({
        where: { id: senderId },
      });
      if (!sender) {
        unmappedCount += senderOrders.length;
        this.logger.warn(
          `Skipping status sync for ${senderOrders.length} order(s) — sender ${senderId} no longer exists`,
        );
        continue;
      }

      const apiKey = this.encryption.decrypt(sender.apiKey);
      const waybillNumbers = senderOrders
        .map((order) => order.npWaybillNumber)
        .filter((number): number is string => number !== null);

      const statuses = await this.novaPoshta.getShipmentStatuses(
        apiKey,
        waybillNumbers,
      );
      const statusByWaybill = new Map(
        statuses.map((status) => [status.waybillNumber, status]),
      );

      for (const order of senderOrders) {
        const status = order.npWaybillNumber
          ? statusByWaybill.get(order.npWaybillNumber)
          : undefined;
        if (!status) {
          unmappedCount += 1;
          this.logger.warn(
            `No Nova Poshta tracking status returned for order ${order.id} (waybill ${order.npWaybillNumber}) — leaving it unchanged`,
          );
          continue;
        }

        const shipmentStatus = shipmentStatuses.find((known) =>
          known.npStatusCodes.includes(status.statusCode),
        );
        if (!shipmentStatus) {
          unmappedCount += 1;
          this.logger.warn(
            `Nova Poshta status code "${status.statusCode}" (${status.status}) for order ${order.id} does not map to any known shipment status — leaving it unchanged`,
          );
          continue;
        }

        if (shipmentStatus.id === order.shipmentStatusId) {
          continue;
        }

        await this.prisma.order.update({
          where: { id: order.id },
          data: { shipmentStatusId: shipmentStatus.id },
        });
        updatedCount += 1;
      }
    }

    return { totalOrders: orders.length, updatedCount, unmappedCount };
  }

  async setStatusFlags(
    id: string,
    dto: SetOrderStatusFlagsDto,
  ): Promise<OrderResponseDto> {
    await this.findOrThrow(id);

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.isPacked !== undefined && { isPacked: dto.isPacked }),
        ...(dto.isOutOfStock !== undefined && {
          isOutOfStock: dto.isOutOfStock,
        }),
      },
    });

    return this.toResponseDto(updated);
  }

  private async resolveItems(
    items: OrderItemDto[],
    freedQuantityByProduct: Map<string, number> = new Map(),
  ): Promise<ResolvedItems> {
    const resolvedItems: OrderItem[] = [];
    const stockDecrements: { productId: string; quantity: number }[] = [];
    const remainingStockByProduct = new Map<string, number>();
    let totalAmount = 0;

    for (const item of items) {
      const productType = await this.prisma.productType.findUnique({
        where: { id: item.productTypeId },
      });
      if (!productType) {
        throw new BadRequestException('Unknown product type in order items');
      }

      if (productType.isCustom) {
        if (item.price === undefined) {
          throw new BadRequestException(
            'price is required for a custom product type item',
          );
        }
        if (!item.name) {
          throw new BadRequestException(
            'name is required for a custom product type item',
          );
        }

        const subtotal = item.price * item.quantity;
        resolvedItems.push({
          productId: null,
          productTypeId: item.productTypeId,
          nameSnapshot: item.name,
          photoUrlSnapshot: null,
          price: item.price,
          isPromo: false,
          quantity: item.quantity,
          subtotal,
        });
        totalAmount += subtotal;
        continue;
      }

      if (!item.productId) {
        throw new BadRequestException(
          'productId is required for a non-custom product type item',
        );
      }

      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product || product.typeId !== item.productTypeId) {
        throw new BadRequestException(
          'Product does not match the given product type',
        );
      }

      if (item.isPromo && product.promoPrice === null) {
        throw new BadRequestException(
          `Product "${product.name}" has no promo price`,
        );
      }

      const unitPrice =
        item.isPromo && product.promoPrice !== null
          ? product.promoPrice
          : product.price;
      const subtotal = unitPrice * item.quantity;

      resolvedItems.push({
        productId: product.id,
        productTypeId: item.productTypeId,
        nameSnapshot: product.name,
        photoUrlSnapshot: product.photoUrl,
        price: unitPrice,
        isPromo: item.isPromo ?? false,
        quantity: item.quantity,
        subtotal,
      });
      totalAmount += subtotal;
      stockDecrements.push({ productId: product.id, quantity: item.quantity });

      const baselineStock =
        remainingStockByProduct.get(product.id) ??
        product.stockQuantity + (freedQuantityByProduct.get(product.id) ?? 0);
      remainingStockByProduct.set(product.id, baselineStock - item.quantity);
    }

    const willBeOutOfStock = [...remainingStockByProduct.values()].some(
      (remaining) => remaining <= 0,
    );

    return {
      items: resolvedItems,
      totalAmount,
      stockDecrements,
      willBeOutOfStock,
    };
  }

  private validateDeliveryDetails(
    deliveryTypeCode: string,
    details: DeliveryDetailsDto,
  ): void {
    if (deliveryTypeCode === 'warehouse' && !details.warehouseRef) {
      throw new BadRequestException(
        'warehouseRef is required for "Відділення" delivery',
      );
    }
    if (deliveryTypeCode === 'postomat' && !details.postomatRef) {
      throw new BadRequestException(
        'postomatRef is required for "Поштомат" delivery',
      );
    }
  }

  private buildWaybillDescription(items: OrderItem[]): string {
    const description = items.map((item) => item.nameSnapshot).join(', ');

    return description.length > MAX_DESCRIPTION_LENGTH
      ? `${description.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`
      : description;
  }

  private buildStockRestores(
    items: OrderItem[],
  ): { productId: string; quantity: number }[] {
    return items
      .filter(
        (item): item is OrderItem & { productId: string } =>
          item.productId !== null,
      )
      .map((item) => ({ productId: item.productId, quantity: item.quantity }));
  }

  private isConcurrencyConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    return error.code === 'P2025' || error.code === 'P2034';
  }

  private resolveCargoType(shipmentTypeCode: string): string {
    return shipmentTypeCode === 'documents' ? 'Documents' : 'Parcel';
  }

  private resolveCodAmount(
    paymentTypeCode: string,
    totalAmount: number,
    partialAmount: number | null,
  ): number | null {
    if (paymentTypeCode === 'cod') {
      return totalAmount;
    }
    if (paymentTypeCode === 'partial') {
      return partialAmount;
    }

    return null;
  }

  private async cleanupFailedOrderUpdate(context: {
    apiKey: string;
    baseParams: Omit<
      UpdateWaybillParams,
      'cargoType' | 'cost' | 'codAmount' | 'description'
    >;
    previousCargoType: string;
    previousCost: number;
    previousCodAmount: number | null;
    previousDescription: string;
  }): Promise<void> {
    try {
      await this.novaPoshta.updateWaybill(context.apiKey, {
        ...context.baseParams,
        cargoType: context.previousCargoType,
        cost: context.previousCost,
        codAmount: context.previousCodAmount,
        description: context.previousDescription,
      });
    } catch (cleanupError) {
      this.logger.error(
        `Failed to revert Nova Poshta waybill ${context.baseParams.waybillRef} after a failed order update — needs manual cleanup`,
        cleanupError instanceof Error ? cleanupError.stack : undefined,
      );
      throw new BadGatewayException(
        'Order update failed, and its Nova Poshta waybill could not be reverted automatically — check it manually in Nova Poshta',
      );
    }
  }

  private async cleanupOrphanedWaybill(
    apiKey: string,
    waybillRef: string,
  ): Promise<void> {
    try {
      await this.novaPoshta.deleteWaybill(apiKey, waybillRef);
    } catch (cleanupError) {
      this.logger.error(
        `Failed to clean up orphaned Nova Poshta waybill ${waybillRef}`,
        cleanupError instanceof Error ? cleanupError.stack : undefined,
      );
      throw new BadGatewayException(
        'Order creation failed, and its temporary Nova Poshta waybill could not be removed automatically — remove it manually in Nova Poshta',
      );
    }
  }

  private async cleanupDeletedOrderWaybill(
    senderId: string,
    waybillRef: string,
  ): Promise<void> {
    const sender = await this.prisma.sender.findUnique({
      where: { id: senderId },
    });
    if (!sender) {
      this.logger.error(
        `Cannot delete Nova Poshta waybill ${waybillRef} — its sender no longer exists`,
      );
      throw new BadGatewayException(
        'Order was deleted, but its Nova Poshta waybill could not be removed automatically — remove it manually in Nova Poshta',
      );
    }

    try {
      const apiKey = this.encryption.decrypt(sender.apiKey);
      await this.novaPoshta.deleteWaybill(apiKey, waybillRef);
    } catch (cleanupError) {
      this.logger.error(
        `Failed to delete Nova Poshta waybill ${waybillRef} after removing its order — needs manual cleanup`,
        cleanupError instanceof Error ? cleanupError.stack : undefined,
      );
      throw new BadGatewayException(
        'Order was deleted, but its Nova Poshta waybill could not be removed automatically — remove it manually in Nova Poshta',
      );
    }
  }

  private async findOrThrow(id: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private toResponseDto(order: Order): OrderResponseDto {
    return {
      id: order.id,
      shipmentTypeId: order.shipmentTypeId,
      paymentTypeId: order.paymentTypeId,
      partialAmount: order.partialAmount,
      totalAmount: order.totalAmount,
      items: order.items.map((item) => ({
        productId: item.productId,
        productTypeId: item.productTypeId,
        nameSnapshot: item.nameSnapshot,
        photoUrlSnapshot: item.photoUrlSnapshot,
        price: item.price,
        isPromo: item.isPromo,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      senderId: order.senderId,
      senderAddressRef: order.senderAddressRef,
      recipient: {
        phone: order.recipient.phone,
        lastName: order.recipient.lastName,
        firstName: order.recipient.firstName,
        middleName: order.recipient.middleName,
      },
      deliveryTypeId: order.deliveryTypeId,
      deliveryDetails: {
        cityRef: order.deliveryDetails.cityRef,
        warehouseRef: order.deliveryDetails.warehouseRef,
        streetRef: order.deliveryDetails.streetRef,
        house: order.deliveryDetails.house,
        apartment: order.deliveryDetails.apartment,
        postomatRef: order.deliveryDetails.postomatRef,
      },
      npWaybillNumber: order.npWaybillNumber,
      npWaybillRef: order.npWaybillRef,
      shipmentStatusId: order.shipmentStatusId,
      isPacked: order.isPacked,
      isOutOfStock: order.isOutOfStock,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
