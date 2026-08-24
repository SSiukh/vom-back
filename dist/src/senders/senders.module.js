"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendersModule = void 0;
const common_1 = require("@nestjs/common");
const senders_controller_1 = require("./senders.controller");
const senders_service_1 = require("./senders.service");
const encryption_module_1 = require("../shared/encryption/encryption.module");
const nova_poshta_module_1 = require("../nova-poshta/nova-poshta.module");
let SendersModule = class SendersModule {
};
exports.SendersModule = SendersModule;
exports.SendersModule = SendersModule = __decorate([
    (0, common_1.Module)({
        imports: [encryption_module_1.EncryptionModule, nova_poshta_module_1.NovaPoshtaModule],
        controllers: [senders_controller_1.SendersController],
        providers: [senders_service_1.SendersService],
    })
], SendersModule);
//# sourceMappingURL=senders.module.js.map