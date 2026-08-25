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
exports.SendersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const encryption_service_1 = require("../shared/encryption/encryption.service");
const nova_poshta_service_1 = require("../nova-poshta/nova-poshta.service");
let SendersService = class SendersService {
    prisma;
    encryption;
    novaPoshta;
    constructor(prisma, encryption, novaPoshta) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.novaPoshta = novaPoshta;
    }
    async verify(dto) {
        const verified = await this.novaPoshta.verifySender(dto.apiKey);
        return { fullName: verified.fullName, phone: verified.phone };
    }
    async create(dto) {
        const verified = await this.novaPoshta.verifySender(dto.apiKey);
        const warehouse = await this.resolveWarehouse(dto.apiKey, dto.cityRef, dto.warehouseRef);
        const sender = await this.prisma.sender.create({
            data: {
                apiKey: this.encryption.encrypt(dto.apiKey),
                fullName: verified.fullName,
                phone: verified.phone,
                npCounterpartyRef: verified.counterpartyRef,
                npContactPersonRef: verified.contactPersonRef,
                addresses: [
                    {
                        npAddressRef: warehouse.ref,
                        description: warehouse.description,
                        cityRef: dto.cityRef,
                        isDeactivated: false,
                    },
                ],
                isActive: false,
                isDeactivated: false,
            },
        });
        return this.toResponseDto(sender);
    }
    async findAll(page, pageSize) {
        const where = { isDeactivated: false };
        const [senders, total] = await Promise.all([
            this.prisma.sender.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.sender.count({ where }),
        ]);
        return {
            items: senders.map((sender) => this.toResponseDto(sender)),
            total,
        };
    }
    async findAddresses(id) {
        const sender = await this.findActiveOrThrow(id);
        return sender.addresses
            .filter((address) => !address.isDeactivated)
            .map((address) => ({
            npAddressRef: address.npAddressRef,
            description: address.description,
        }));
    }
    async activate(id) {
        const sender = await this.findActiveOrThrow(id);
        const [, updated] = await this.prisma.$transaction([
            this.prisma.sender.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            }),
            this.prisma.sender.update({
                where: { id: sender.id },
                data: { isActive: true },
            }),
        ]);
        return this.toResponseDto(updated);
    }
    async refresh(id) {
        const sender = await this.findActiveOrThrow(id);
        const apiKey = this.encryption.decrypt(sender.apiKey);
        const verified = await this.novaPoshta.verifySender(apiKey);
        const updated = await this.prisma.sender.update({
            where: { id: sender.id },
            data: {
                fullName: verified.fullName,
                phone: verified.phone,
                npCounterpartyRef: verified.counterpartyRef,
                npContactPersonRef: verified.contactPersonRef,
            },
        });
        return this.toResponseDto(updated);
    }
    async setWarehouse(id, dto) {
        const sender = await this.findActiveOrThrow(id);
        const apiKey = this.encryption.decrypt(sender.apiKey);
        const warehouse = await this.resolveWarehouse(apiKey, dto.cityRef, dto.warehouseRef);
        const updated = await this.prisma.sender.update({
            where: { id: sender.id },
            data: {
                addresses: [
                    {
                        npAddressRef: warehouse.ref,
                        description: warehouse.description,
                        cityRef: dto.cityRef,
                        isDeactivated: false,
                    },
                ],
            },
        });
        return this.toResponseDto(updated);
    }
    async deactivate(id) {
        const sender = await this.findActiveOrThrow(id);
        await this.prisma.sender.update({
            where: { id: sender.id },
            data: { isActive: false, isDeactivated: true },
        });
    }
    async resolveWarehouse(apiKey, cityRef, warehouseRef) {
        const warehouses = await this.novaPoshta.getWarehouses(apiKey, cityRef);
        const warehouse = warehouses.find((option) => option.ref === warehouseRef);
        if (!warehouse) {
            throw new common_1.BadRequestException('Unknown warehouse for the given city — verify cityRef/warehouseRef against GET /nova-poshta/warehouses');
        }
        return warehouse;
    }
    async findActiveOrThrow(id) {
        const sender = await this.prisma.sender.findFirst({
            where: { id, isDeactivated: false },
        });
        if (!sender) {
            throw new common_1.NotFoundException('Sender not found');
        }
        return sender;
    }
    toResponseDto(sender) {
        return {
            id: sender.id,
            fullName: sender.fullName,
            phone: sender.phone,
            isActive: sender.isActive,
            createdAt: sender.createdAt,
            updatedAt: sender.updatedAt,
        };
    }
};
exports.SendersService = SendersService;
exports.SendersService = SendersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        nova_poshta_service_1.NovaPoshtaService])
], SendersService);
//# sourceMappingURL=senders.service.js.map