import { OrderItemResponseDto } from './order-item-response.dto';
import { RecipientResponseDto } from './recipient-response.dto';
import { DeliveryDetailsResponseDto } from './delivery-details-response.dto';
export declare class OrderResponseDto {
    id: string;
    shipmentTypeId: string;
    paymentTypeId: string;
    partialAmount: number | null;
    totalAmount: number;
    items: OrderItemResponseDto[];
    senderId: string;
    senderAddressRef: string;
    recipient: RecipientResponseDto;
    deliveryTypeId: string;
    deliveryDetails: DeliveryDetailsResponseDto;
    npWaybillNumber: string | null;
    npWaybillRef: string | null;
    shipmentStatusId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
