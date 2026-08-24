import { OrderItemDto } from './order-item.dto';
export declare class UpdateOrderDto {
    shipmentTypeId?: string;
    paymentTypeId?: string;
    partialAmount?: number;
    items?: OrderItemDto[];
}
