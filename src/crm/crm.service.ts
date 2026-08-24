import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListCrmQueryDto } from './dto/list-crm-query.dto';
import { CrmRowResponseDto } from './dto/crm-row-response.dto';
import { ListCrmResponseDto } from './dto/list-crm-response.dto';
import { Order } from './entities/order.entity';

const DEFAULT_SORT_ORDER = 'desc';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async findTable(
    page: number,
    pageSize: number,
    query: ListCrmQueryDto,
  ): Promise<ListCrmResponseDto> {
    const where = {
      ...((query.dateFrom || query.dateTo) && {
        createdAt: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && { lte: new Date(query.dateTo) }),
        },
      }),
      ...(query.productTypeId && {
        items: { some: { productTypeId: query.productTypeId } },
      }),
      ...(query.shipmentStatusId && {
        shipmentStatusId: query.shipmentStatusId,
      }),
    };

    const [orders, aggregate] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: query.sortOrder ?? DEFAULT_SORT_ORDER },
      }),
      this.prisma.order.aggregate({
        where,
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      items: orders.map((order) => this.toRowDto(order)),
      total: aggregate._count._all,
      totalAmountSum: aggregate._sum.totalAmount ?? 0,
    };
  }

  private toRowDto(order: Order): CrmRowResponseDto {
    const recipientFullName = [
      order.recipient.lastName,
      order.recipient.firstName,
      order.recipient.middleName,
    ]
      .filter(Boolean)
      .join(' ');

    const productTypeIds = [
      ...new Set(order.items.map((item) => item.productTypeId)),
    ];

    return {
      id: order.id,
      createdAt: order.createdAt,
      npWaybillNumber: order.npWaybillNumber,
      paymentTypeId: order.paymentTypeId,
      recipientFullName,
      recipientPhone: order.recipient.phone,
      totalAmount: order.totalAmount,
      shipmentStatusId: order.shipmentStatusId,
      productTypeIds,
    };
  }
}
