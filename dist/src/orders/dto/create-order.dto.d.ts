import { OrderItemDto } from './order-item.dto';
import { RecipientDto } from './recipient.dto';
import { DeliveryDetailsDto } from './delivery-details.dto';
export declare class CreateOrderDto {
    orderTypeId: string;
    shipmentTypeId: string;
    paymentTypeId: string;
    partialAmount?: number;
    items: OrderItemDto[];
    senderId: string;
    senderAddressRef: string;
    recipient: RecipientDto;
    deliveryTypeId: string;
    deliveryDetails: DeliveryDetailsDto;
}
