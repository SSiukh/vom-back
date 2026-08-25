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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const encryption_service_1 = require("../shared/encryption/encryption.service");
const nova_poshta_service_1 = require("../nova-poshta/nova-poshta.service");
const MAX_DESCRIPTION_LENGTH = 200;
let OrdersService = OrdersService_1 = class OrdersService {
    prisma;
    encryption;
    novaPoshta;
    logger = new common_1.Logger(OrdersService_1.name);
    constructor(prisma, encryption, novaPoshta) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.novaPoshta = novaPoshta;
    }
    async create(dto) {
        const [shipmentType, paymentType, deliveryType] = await Promise.all([
            this.prisma.shipmentType.findUnique({
                where: { id: dto.shipmentTypeId },
            }),
            this.prisma.paymentType.findUnique({
                where: { id: dto.paymentTypeId },
            }),
            this.prisma.deliveryType.findUnique({
                where: { id: dto.deliveryTypeId },
            }),
        ]);
        if (!shipmentType) {
            throw new common_1.BadRequestException('Unknown shipment type');
        }
        if (!paymentType) {
            throw new common_1.BadRequestException('Unknown payment type');
        }
        if (!deliveryType) {
            throw new common_1.BadRequestException('Unknown delivery type');
        }
        if (paymentType.code === 'partial' && dto.partialAmount === undefined) {
            throw new common_1.BadRequestException('partialAmount is required for the "часткова оплата" payment type');
        }
        if (deliveryType.code === 'address') {
            throw new common_1.BadRequestException('Door-to-door ("Адреса") delivery is not supported yet — its Nova Poshta request shape has not been verified. Use "Відділення" or "Поштомат" for now.');
        }
        this.validateDeliveryDetails(deliveryType.code, dto.deliveryDetails);
        const recipientAddressRef = deliveryType.code === 'postomat'
            ? dto.deliveryDetails.postomatRef
            : dto.deliveryDetails.warehouseRef;
        if (!recipientAddressRef) {
            throw new common_1.BadRequestException('Missing warehouse/postomat ref for the selected delivery type');
        }
        const sender = await this.prisma.sender.findFirst({
            where: { id: dto.senderId, isDeactivated: false },
        });
        if (!sender) {
            throw new common_1.BadRequestException('Sender not found or deactivated');
        }
        const senderAddress = sender.addresses.find((address) => address.npAddressRef === dto.senderAddressRef && !address.isDeactivated);
        if (!senderAddress) {
            throw new common_1.BadRequestException('Sender address not found or deactivated');
        }
        const { items, totalAmount, stockDecrements } = await this.resolveItems(dto.items);
        if (paymentType.code === 'partial' && dto.partialAmount > totalAmount) {
            throw new common_1.BadRequestException('partialAmount cannot exceed the order total');
        }
        const apiKey = this.encryption.decrypt(sender.apiKey);
        const recipientFullName = [
            dto.recipient.lastName,
            dto.recipient.firstName,
            dto.recipient.middleName,
        ]
            .filter(Boolean)
            .join(' ');
        const waybill = await this.novaPoshta.createWaybill(apiKey, {
            senderCounterpartyRef: sender.npCounterpartyRef,
            senderContactPersonRef: sender.npContactPersonRef,
            senderPhone: sender.phone,
            senderCityRef: senderAddress.cityRef,
            senderAddressRef: dto.senderAddressRef,
            cargoType: this.resolveCargoType(shipmentType.code),
            serviceType: 'WarehouseWarehouse',
            cost: totalAmount,
            codAmount: this.resolveCodAmount(paymentType.code, totalAmount, dto.partialAmount ?? null),
            description: this.buildWaybillDescription(items),
            recipientCityRef: dto.deliveryDetails.cityRef,
            recipientAddressRef,
            recipientName: recipientFullName,
            recipientPhone: dto.recipient.phone,
        });
        try {
            const [order] = await this.prisma.$transaction([
                this.prisma.order.create({
                    data: {
                        shipmentTypeId: dto.shipmentTypeId,
                        paymentTypeId: dto.paymentTypeId,
                        partialAmount: dto.partialAmount ?? null,
                        totalAmount,
                        items,
                        senderId: dto.senderId,
                        senderAddressRef: dto.senderAddressRef,
                        recipient: {
                            phone: dto.recipient.phone,
                            lastName: dto.recipient.lastName,
                            firstName: dto.recipient.firstName,
                            middleName: dto.recipient.middleName ?? null,
                        },
                        deliveryTypeId: dto.deliveryTypeId,
                        deliveryDetails: {
                            cityRef: dto.deliveryDetails.cityRef,
                            warehouseRef: dto.deliveryDetails.warehouseRef ?? null,
                            streetRef: dto.deliveryDetails.streetRef ?? null,
                            house: dto.deliveryDetails.house ?? null,
                            apartment: dto.deliveryDetails.apartment ?? null,
                            postomatRef: dto.deliveryDetails.postomatRef ?? null,
                        },
                        npWaybillNumber: waybill.waybillNumber,
                        npWaybillRef: waybill.waybillRef,
                        shipmentStatusId: null,
                    },
                }),
                ...stockDecrements.map(({ productId, quantity }) => this.prisma.product.update({
                    where: { id: productId, stockQuantity: { gte: quantity } },
                    data: { stockQuantity: { decrement: quantity } },
                })),
            ]);
            return this.toResponseDto(order);
        }
        catch (error) {
            await this.cleanupOrphanedWaybill(apiKey, waybill.waybillRef);
            if (this.isConcurrencyConflict(error)) {
                throw new common_1.BadRequestException('Not enough stock — a concurrent order already reserved it');
            }
            throw error;
        }
    }
    async update(id, dto) {
        const order = await this.findOrThrow(id);
        const shipmentTypeId = dto.shipmentTypeId ?? order.shipmentTypeId;
        const paymentTypeId = dto.paymentTypeId ?? order.paymentTypeId;
        const [shipmentType, paymentType] = await Promise.all([
            this.prisma.shipmentType.findUnique({ where: { id: shipmentTypeId } }),
            this.prisma.paymentType.findUnique({ where: { id: paymentTypeId } }),
        ]);
        if (!shipmentType) {
            throw new common_1.BadRequestException('Unknown shipment type');
        }
        if (!paymentType) {
            throw new common_1.BadRequestException('Unknown payment type');
        }
        const partialAmount = dto.partialAmount !== undefined
            ? dto.partialAmount
            : (order.partialAmount ?? undefined);
        if (paymentType.code === 'partial' && partialAmount === undefined) {
            throw new common_1.BadRequestException('partialAmount is required for the "часткова оплата" payment type');
        }
        const resolvedPartialAmount = paymentType.code === 'partial' ? partialAmount : null;
        const paymentTypeChanged = paymentTypeId !== order.paymentTypeId;
        const previousPaymentType = paymentTypeChanged
            ? await this.prisma.paymentType.findUnique({
                where: { id: order.paymentTypeId },
            })
            : paymentType;
        if (!previousPaymentType) {
            throw new common_1.BadRequestException("This order's original payment type no longer exists — cannot safely compute a rollback value for the waybill");
        }
        const previousCodAmount = this.resolveCodAmount(previousPaymentType.code, order.totalAmount, order.partialAmount);
        const itemsChanged = dto.items !== undefined;
        const stockRestores = itemsChanged
            ? this.buildStockRestores(order.items)
            : [];
        let items = order.items;
        let totalAmount = order.totalAmount;
        let stockDecrements = [];
        if (dto.items) {
            const freedQuantityByProduct = new Map();
            for (const restore of stockRestores) {
                freedQuantityByProduct.set(restore.productId, (freedQuantityByProduct.get(restore.productId) ?? 0) +
                    restore.quantity);
            }
            const resolved = await this.resolveItems(dto.items, freedQuantityByProduct);
            items = resolved.items;
            totalAmount = resolved.totalAmount;
            stockDecrements = resolved.stockDecrements;
        }
        if (paymentType.code === 'partial' &&
            resolvedPartialAmount > totalAmount) {
            throw new common_1.BadRequestException('partialAmount cannot exceed the order total');
        }
        const codAmount = this.resolveCodAmount(paymentType.code, totalAmount, resolvedPartialAmount);
        const codAmountChanged = codAmount !== previousCodAmount;
        const shipmentTypeChanged = shipmentTypeId !== order.shipmentTypeId;
        const waybillContentChanged = itemsChanged &&
            (totalAmount !== order.totalAmount ||
                this.buildWaybillDescription(items) !==
                    this.buildWaybillDescription(order.items));
        const needsWaybillUpdate = order.npWaybillRef !== null &&
            (waybillContentChanged || shipmentTypeChanged || codAmountChanged);
        let waybillUpdateContext = null;
        if (needsWaybillUpdate) {
            const sender = await this.prisma.sender.findUnique({
                where: { id: order.senderId },
            });
            if (!sender) {
                throw new common_1.BadRequestException('Sender for this order no longer exists');
            }
            const senderAddress = sender.addresses.find((address) => address.npAddressRef === order.senderAddressRef);
            if (!senderAddress) {
                throw new common_1.BadRequestException('Sender address for this order no longer exists');
            }
            const recipientAddressRef = order.deliveryDetails.warehouseRef ?? order.deliveryDetails.postomatRef;
            if (!recipientAddressRef) {
                throw new common_1.BadRequestException('Order has no recorded warehouse/postomat ref to update the waybill against');
            }
            const apiKey = this.encryption.decrypt(sender.apiKey);
            const baseParams = {
                waybillRef: order.npWaybillRef,
                senderCounterpartyRef: sender.npCounterpartyRef,
                senderContactPersonRef: sender.npContactPersonRef,
                senderPhone: sender.phone,
                senderCityRef: senderAddress.cityRef,
                senderAddressRef: order.senderAddressRef,
                serviceType: 'WarehouseWarehouse',
                recipientCityRef: order.deliveryDetails.cityRef,
                recipientAddressRef,
                recipientPhone: order.recipient.phone,
            };
            const previousShipmentType = shipmentTypeChanged
                ? await this.prisma.shipmentType.findUnique({
                    where: { id: order.shipmentTypeId },
                })
                : shipmentType;
            if (!previousShipmentType) {
                throw new common_1.BadRequestException("This order's original shipment type no longer exists — cannot safely compute a rollback value for the waybill");
            }
            waybillUpdateContext = {
                apiKey,
                baseParams,
                previousCargoType: this.resolveCargoType(previousShipmentType.code),
                previousCost: order.totalAmount,
                previousCodAmount,
                previousDescription: this.buildWaybillDescription(order.items),
            };
            await this.novaPoshta.updateWaybill(apiKey, {
                ...baseParams,
                cargoType: this.resolveCargoType(shipmentType.code),
                cost: totalAmount,
                codAmount,
                description: this.buildWaybillDescription(items),
            });
        }
        try {
            await this.prisma.$transaction([
                this.prisma.order.update({
                    where: { id, updatedAt: order.updatedAt },
                    data: {
                        shipmentTypeId,
                        paymentTypeId,
                        partialAmount: resolvedPartialAmount,
                        totalAmount,
                        items,
                    },
                }),
                ...stockRestores.map(({ productId, quantity }) => this.prisma.product.update({
                    where: { id: productId },
                    data: { stockQuantity: { increment: quantity } },
                })),
                ...stockDecrements.map(({ productId, quantity }) => this.prisma.product.update({
                    where: { id: productId, stockQuantity: { gte: quantity } },
                    data: { stockQuantity: { decrement: quantity } },
                })),
            ]);
        }
        catch (error) {
            if (waybillUpdateContext) {
                await this.cleanupFailedOrderUpdate(waybillUpdateContext);
            }
            if (this.isConcurrencyConflict(error)) {
                throw new common_1.BadRequestException('This order was modified concurrently, or stock was depleted by another order — please retry');
            }
            throw error;
        }
        const updated = await this.findOrThrow(id);
        return this.toResponseDto(updated);
    }
    async findAll(page, pageSize, dateFrom, dateTo) {
        const where = {
            ...((dateFrom || dateTo) && {
                createdAt: {
                    ...(dateFrom && { gte: new Date(dateFrom) }),
                    ...(dateTo && { lte: new Date(dateTo) }),
                },
            }),
        };
        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.order.count({ where }),
        ]);
        return {
            items: orders.map((order) => this.toResponseDto(order)),
            total,
        };
    }
    async findOne(id) {
        const order = await this.findOrThrow(id);
        return this.toResponseDto(order);
    }
    async remove(id) {
        const order = await this.findOrThrow(id);
        const stockRestores = this.buildStockRestores(order.items);
        await this.prisma.$transaction([
            this.prisma.order.delete({ where: { id } }),
            ...stockRestores.map(({ productId, quantity }) => this.prisma.product.update({
                where: { id: productId },
                data: { stockQuantity: { increment: quantity } },
            })),
        ]);
        if (order.npWaybillRef) {
            await this.cleanupDeletedOrderWaybill(order.senderId, order.npWaybillRef);
        }
    }
    async syncStatus(id) {
        const order = await this.findOrThrow(id);
        if (!order.npWaybillNumber) {
            throw new common_1.BadRequestException('This order has no Nova Poshta waybill to sync a status from');
        }
        const sender = await this.prisma.sender.findUnique({
            where: { id: order.senderId },
        });
        if (!sender) {
            throw new common_1.BadRequestException('Sender for this order no longer exists');
        }
        const apiKey = this.encryption.decrypt(sender.apiKey);
        const status = await this.novaPoshta.getShipmentStatus(apiKey, order.npWaybillNumber);
        const shipmentStatus = await this.prisma.shipmentStatus.findFirst({
            where: { npStatusCodes: { has: status.statusCode } },
        });
        if (!shipmentStatus) {
            this.logger.warn(`Nova Poshta status code "${status.statusCode}" (${status.status}) for order ${id} does not map to any known shipment status — leaving it unchanged`);
        }
        const updated = await this.prisma.order.update({
            where: { id },
            data: { shipmentStatusId: shipmentStatus?.id ?? order.shipmentStatusId },
        });
        return this.toResponseDto(updated);
    }
    async resolveItems(items, freedQuantityByProduct = new Map()) {
        const resolvedItems = [];
        const stockDecrements = [];
        let totalAmount = 0;
        const requestedQuantityByProduct = new Map();
        for (const item of items) {
            if (item.productId) {
                requestedQuantityByProduct.set(item.productId, (requestedQuantityByProduct.get(item.productId) ?? 0) + item.quantity);
            }
        }
        for (const item of items) {
            const productType = await this.prisma.productType.findUnique({
                where: { id: item.productTypeId },
            });
            if (!productType) {
                throw new common_1.BadRequestException('Unknown product type in order items');
            }
            if (productType.isCustom) {
                if (item.price === undefined) {
                    throw new common_1.BadRequestException('price is required for a custom product type item');
                }
                if (!item.name) {
                    throw new common_1.BadRequestException('name is required for a custom product type item');
                }
                const subtotal = item.price * item.quantity;
                resolvedItems.push({
                    productId: null,
                    productTypeId: item.productTypeId,
                    nameSnapshot: item.name,
                    photoUrlSnapshot: null,
                    price: item.price,
                    isPromo: false,
                    quantity: item.quantity,
                    subtotal,
                });
                totalAmount += subtotal;
                continue;
            }
            if (!item.productId) {
                throw new common_1.BadRequestException('productId is required for a non-custom product type item');
            }
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
            });
            if (!product || product.typeId !== item.productTypeId) {
                throw new common_1.BadRequestException('Product does not match the given product type');
            }
            if (item.isPromo && product.promoPrice === null) {
                throw new common_1.BadRequestException(`Product "${product.name}" has no promo price`);
            }
            const totalRequestedQuantity = requestedQuantityByProduct.get(product.id) ?? item.quantity;
            const availableStock = product.stockQuantity + (freedQuantityByProduct.get(product.id) ?? 0);
            if (availableStock < totalRequestedQuantity) {
                throw new common_1.BadRequestException(`Not enough stock for product "${product.name}"`);
            }
            const unitPrice = item.isPromo && product.promoPrice !== null
                ? product.promoPrice
                : product.price;
            const subtotal = unitPrice * item.quantity;
            resolvedItems.push({
                productId: product.id,
                productTypeId: item.productTypeId,
                nameSnapshot: product.name,
                photoUrlSnapshot: product.photoUrl,
                price: unitPrice,
                isPromo: item.isPromo ?? false,
                quantity: item.quantity,
                subtotal,
            });
            totalAmount += subtotal;
            stockDecrements.push({ productId: product.id, quantity: item.quantity });
        }
        return { items: resolvedItems, totalAmount, stockDecrements };
    }
    validateDeliveryDetails(deliveryTypeCode, details) {
        if (deliveryTypeCode === 'warehouse' && !details.warehouseRef) {
            throw new common_1.BadRequestException('warehouseRef is required for "Відділення" delivery');
        }
        if (deliveryTypeCode === 'postomat' && !details.postomatRef) {
            throw new common_1.BadRequestException('postomatRef is required for "Поштомат" delivery');
        }
    }
    buildWaybillDescription(items) {
        const description = items.map((item) => item.nameSnapshot).join(', ');
        return description.length > MAX_DESCRIPTION_LENGTH
            ? `${description.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`
            : description;
    }
    buildStockRestores(items) {
        return items
            .filter((item) => item.productId !== null)
            .map((item) => ({ productId: item.productId, quantity: item.quantity }));
    }
    isConcurrencyConflict(error) {
        if (!(error instanceof client_1.Prisma.PrismaClientKnownRequestError)) {
            return false;
        }
        return error.code === 'P2025' || error.code === 'P2034';
    }
    resolveCargoType(shipmentTypeCode) {
        return shipmentTypeCode === 'documents' ? 'Documents' : 'Parcel';
    }
    resolveCodAmount(paymentTypeCode, totalAmount, partialAmount) {
        if (paymentTypeCode === 'cod') {
            return totalAmount;
        }
        if (paymentTypeCode === 'partial') {
            return partialAmount;
        }
        return null;
    }
    async cleanupFailedOrderUpdate(context) {
        try {
            await this.novaPoshta.updateWaybill(context.apiKey, {
                ...context.baseParams,
                cargoType: context.previousCargoType,
                cost: context.previousCost,
                codAmount: context.previousCodAmount,
                description: context.previousDescription,
            });
        }
        catch (cleanupError) {
            this.logger.error(`Failed to revert Nova Poshta waybill ${context.baseParams.waybillRef} after a failed order update — needs manual cleanup`, cleanupError instanceof Error ? cleanupError.stack : undefined);
            throw new common_1.BadGatewayException('Order update failed, and its Nova Poshta waybill could not be reverted automatically — check it manually in Nova Poshta');
        }
    }
    async cleanupOrphanedWaybill(apiKey, waybillRef) {
        try {
            await this.novaPoshta.deleteWaybill(apiKey, waybillRef);
        }
        catch (cleanupError) {
            this.logger.error(`Failed to clean up orphaned Nova Poshta waybill ${waybillRef}`, cleanupError instanceof Error ? cleanupError.stack : undefined);
            throw new common_1.BadGatewayException('Order creation failed, and its temporary Nova Poshta waybill could not be removed automatically — remove it manually in Nova Poshta');
        }
    }
    async cleanupDeletedOrderWaybill(senderId, waybillRef) {
        const sender = await this.prisma.sender.findUnique({
            where: { id: senderId },
        });
        if (!sender) {
            this.logger.error(`Cannot delete Nova Poshta waybill ${waybillRef} — its sender no longer exists`);
            throw new common_1.BadGatewayException('Order was deleted, but its Nova Poshta waybill could not be removed automatically — remove it manually in Nova Poshta');
        }
        try {
            const apiKey = this.encryption.decrypt(sender.apiKey);
            await this.novaPoshta.deleteWaybill(apiKey, waybillRef);
        }
        catch (cleanupError) {
            this.logger.error(`Failed to delete Nova Poshta waybill ${waybillRef} after removing its order — needs manual cleanup`, cleanupError instanceof Error ? cleanupError.stack : undefined);
            throw new common_1.BadGatewayException('Order was deleted, but its Nova Poshta waybill could not be removed automatically — remove it manually in Nova Poshta');
        }
    }
    async findOrThrow(id) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        return order;
    }
    toResponseDto(order) {
        return {
            id: order.id,
            shipmentTypeId: order.shipmentTypeId,
            paymentTypeId: order.paymentTypeId,
            partialAmount: order.partialAmount,
            totalAmount: order.totalAmount,
            items: order.items.map((item) => ({
                productId: item.productId,
                productTypeId: item.productTypeId,
                nameSnapshot: item.nameSnapshot,
                photoUrlSnapshot: item.photoUrlSnapshot,
                price: item.price,
                isPromo: item.isPromo,
                quantity: item.quantity,
                subtotal: item.subtotal,
            })),
            senderId: order.senderId,
            senderAddressRef: order.senderAddressRef,
            recipient: {
                phone: order.recipient.phone,
                lastName: order.recipient.lastName,
                firstName: order.recipient.firstName,
                middleName: order.recipient.middleName,
            },
            deliveryTypeId: order.deliveryTypeId,
            deliveryDetails: {
                cityRef: order.deliveryDetails.cityRef,
                warehouseRef: order.deliveryDetails.warehouseRef,
                streetRef: order.deliveryDetails.streetRef,
                house: order.deliveryDetails.house,
                apartment: order.deliveryDetails.apartment,
                postomatRef: order.deliveryDetails.postomatRef,
            },
            npWaybillNumber: order.npWaybillNumber,
            npWaybillRef: order.npWaybillRef,
            shipmentStatusId: order.shipmentStatusId,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
        };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        nova_poshta_service_1.NovaPoshtaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map