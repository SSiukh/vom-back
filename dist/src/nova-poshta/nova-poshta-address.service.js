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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NovaPoshtaAddressService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const encryption_service_1 = require("../shared/encryption/encryption.service");
const nova_poshta_service_1 = require("./nova-poshta.service");
let NovaPoshtaAddressService = class NovaPoshtaAddressService {
    prisma;
    encryption;
    novaPoshta;
    constructor(prisma, encryption, novaPoshta) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.novaPoshta = novaPoshta;
    }
    async searchCities(query) {
        const apiKey = await this.resolveActiveSenderApiKey();
        const cities = await this.novaPoshta.searchCities(apiKey, query);
        return cities.map((city) => ({
            ref: city.ref,
            description: city.description,
        }));
    }
    async getWarehouses(cityRef) {
        const apiKey = await this.resolveActiveSenderApiKey();
        const warehouses = await this.novaPoshta.getWarehouses(apiKey, cityRef);
        return warehouses.map((warehouse) => ({
            ref: warehouse.ref,
            description: warehouse.description,
        }));
    }
    async getStreets(cityRef, query) {
        const apiKey = await this.resolveActiveSenderApiKey();
        const streets = await this.novaPoshta.getStreets(apiKey, cityRef, query);
        return streets.map((street) => ({
            ref: street.ref,
            description: street.description,
        }));
    }
    async getPostomats(cityRef) {
        const apiKey = await this.resolveActiveSenderApiKey();
        const postomats = await this.novaPoshta.getPostomats(apiKey, cityRef);
        return postomats.map((postomat) => ({
            ref: postomat.ref,
            description: postomat.description,
        }));
    }
    async resolveActiveSenderApiKey() {
        const sender = await this.prisma.sender.findFirst({
            where: { isActive: true, isDeactivated: false },
        });
        if (!sender) {
            throw new common_1.BadRequestException('No active sender configured');
        }
        return this.encryption.decrypt(sender.apiKey);
    }
};
exports.NovaPoshtaAddressService = NovaPoshtaAddressService;
exports.NovaPoshtaAddressService = NovaPoshtaAddressService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        nova_poshta_service_1.NovaPoshtaService])
], NovaPoshtaAddressService);
//# sourceMappingURL=nova-poshta-address.service.js.map