"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const orders_service_1 = require("./orders.service");
const create_order_dto_1 = require("./dto/create-order.dto");
const update_order_dto_1 = require("./dto/update-order.dto");
const list_orders_query_dto_1 = require("./dto/list-orders-query.dto");
const parse_object_id_pipe_1 = require("../shared/pipes/parse-object-id.pipe");
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const NOVA_POSHTA_CALL_THROTTLE_TTL_MS = 60_000;
const NOVA_POSHTA_CALL_THROTTLE_LIMIT = 20;
let OrdersController = class OrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    create(dto) {
        return this.ordersService.create(dto);
    }
    findAll(query) {
        return this.ordersService.findAll(query.page ?? DEFAULT_PAGE, query.pageSize ?? DEFAULT_PAGE_SIZE, query.dateFrom, query.dateTo);
    }
    findOne(id) {
        return this.ordersService.findOne(id);
    }
    update(id, dto) {
        return this.ordersService.update(id, dto);
    }
    syncStatus(id) {
        return this.ordersService.syncStatus(id);
    }
    remove(id) {
        return this.ordersService.remove(id);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, throttler_1.Throttle)({
        default: {
            limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
            ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
        },
    }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.CreateOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_orders_query_dto_1.ListOrdersQueryDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', parse_object_id_pipe_1.ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOne", null);
__decorate([
    (0, throttler_1.Throttle)({
        default: {
            limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
            ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
        },
    }),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', parse_object_id_pipe_1.ParseObjectIdPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_order_dto_1.UpdateOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "update", null);
__decorate([
    (0, throttler_1.Throttle)({
        default: {
            limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
            ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
        },
    }),
    (0, common_1.Patch)(':id/sync-status'),
    __param(0, (0, common_1.Param)('id', parse_object_id_pipe_1.ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "syncStatus", null);
__decorate([
    (0, throttler_1.Throttle)({
        default: {
            limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
            ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
        },
    }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', parse_object_id_pipe_1.ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "remove", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiTags)('orders'),
    (0, common_1.Controller)('orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map