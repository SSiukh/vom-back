import {
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
} from '@prisma/client';

export type Order = PrismaOrder;
export type OrderItem = PrismaOrderItem;
