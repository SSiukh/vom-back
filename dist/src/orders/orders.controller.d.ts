import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { ListOrdersResponseDto } from './dto/list-orders-response.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    create(dto: CreateOrderDto): Promise<OrderResponseDto>;
    findAll(query: ListOrdersQueryDto): Promise<ListOrdersResponseDto>;
    findOne(id: string): Promise<OrderResponseDto>;
    update(id: string, dto: UpdateOrderDto): Promise<OrderResponseDto>;
    syncStatus(id: string): Promise<OrderResponseDto>;
    remove(id: string): Promise<void>;
}
