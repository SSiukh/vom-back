import { OrderItemDto } from './order-item.dto';
export declare class UpdateOrderDto {
    orderTypeId?: string;
    shipmentTypeId?: string;
    paymentTypeId?: string;
    partialAmount?: number;
    items?: OrderItemDto[];
}
