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
exports.SendersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const senders_service_1 = require("./senders.service");
const verify_sender_dto_1 = require("./dto/verify-sender.dto");
const create_sender_dto_1 = require("./dto/create-sender.dto");
const set_sender_warehouse_dto_1 = require("./dto/set-sender-warehouse.dto");
const list_senders_query_dto_1 = require("./dto/list-senders-query.dto");
const parse_object_id_pipe_1 = require("../shared/pipes/parse-object-id.pipe");
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const NOVA_POSHTA_CALL_THROTTLE_TTL_MS = 60_000;
const NOVA_POSHTA_CALL_THROTTLE_LIMIT = 5;
let SendersController = class SendersController {
    sendersService;
    constructor(sendersService) {
        this.sendersService = sendersService;
    }
    findAll(query) {
        return this.sendersService.findAll(query.page ?? DEFAULT_PAGE, query.pageSize ?? DEFAULT_PAGE_SIZE);
    }
    verify(dto) {
        return this.sendersService.verify(dto);
    }
    create(dto) {
        return this.sendersService.create(dto);
    }
    activate(id) {
        return this.sendersService.activate(id);
    }
    refresh(id) {
        return this.sendersService.refresh(id);
    }
    setWarehouse(id, dto) {
        return this.sendersService.setWarehouse(id, dto);
    }
    deactivate(id) {
        return this.sendersService.deactivate(id);
    }
    findAddresses(id) {
        return this.sendersService.findAddresses(id);
    }
};
exports.SendersController = SendersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_senders_query_dto_1.ListSendersQueryDto]),
    __metadata("design:returntype", Promise)
], SendersController.prototype, "findAll", null);
__decorate([
    (0, throttler_1.Throttle)({
        default: {
            limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
            ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
        },
    }),
    (0, common_1.Post)('verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_sender_dto_1.VerifySenderDto]),
    __metadata("design:returntype", Promise)
], SendersController.prototype, "verify", null);
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
    __metadata("design:paramtypes", [create_sender_dto_1.CreateSenderDto]),
    __metadata("design:returntype", Promise)
], SendersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    __param(0, (0, common_1.Param)('id', parse_object_id_pipe_1.ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SendersController.prototype, "activate", null);
__decorate([
    (0, throttler_1.Throttle)({
        default: {
            limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
            ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
        },
    }),
    (0, common_1.Patch)(':id/refresh'),
    __param(0, (0, common_1.Param)('id', parse_object_id_pipe_1.ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SendersController.prototype, "refresh", null);
__decorate([
    (0, throttler_1.Throttle)({
        default: {
            limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
            ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
        },
    }),
    (0, common_1.Patch)(':id/warehouse'),
    __param(0, (0, common_1.Param)('id', parse_object_id_pipe_1.ParseObjectIdPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, set_sender_warehouse_dto_1.SetSenderWarehouseDto]),
    __metadata("design:returntype", Promise)
], SendersController.prototype, "setWarehouse", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', parse_object_id_pipe_1.ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SendersController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Get)(':id/addresses'),
    __param(0, (0, common_1.Param)('id', parse_object_id_pipe_1.ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SendersController.prototype, "findAddresses", null);
exports.SendersController = SendersController = __decorate([
    (0, swagger_1.ApiTags)('senders'),
    (0, common_1.Controller)('senders'),
    __metadata("design:paramtypes", [senders_service_1.SendersService])
], SendersController);
//# sourceMappingURL=senders.controller.js.map