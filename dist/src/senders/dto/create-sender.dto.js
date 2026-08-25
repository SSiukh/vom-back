"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSenderDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const verify_sender_dto_1 = require("./verify-sender.dto");
const set_sender_warehouse_dto_1 = require("./set-sender-warehouse.dto");
class CreateSenderDto extends (0, swagger_1.IntersectionType)(verify_sender_dto_1.VerifySenderDto, set_sender_warehouse_dto_1.SetSenderWarehouseDto) {
}
exports.CreateSenderDto = CreateSenderDto;
//# sourceMappingURL=create-sender.dto.js.map