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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ExpensesService = class ExpensesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const type = await this.assertKnownType(dto.typeId);
        if (type.requiresName && !dto.name) {
            throw new common_1.BadRequestException('name is required for the "Інше" expense type');
        }
        const expense = await this.prisma.expense.create({
            data: {
                typeId: dto.typeId,
                name: type.requiresName ? dto.name : null,
                amount: dto.amount,
            },
        });
        return this.toResponseDto(expense);
    }
    async findAll(page, pageSize) {
        const [expenses, total] = await Promise.all([
            this.prisma.expense.findMany({
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.expense.count(),
        ]);
        return {
            items: expenses.map((expense) => this.toResponseDto(expense)),
            total,
        };
    }
    async findOne(id) {
        const expense = await this.findOrThrow(id);
        return this.toResponseDto(expense);
    }
    async update(id, dto) {
        const expense = await this.findOrThrow(id);
        const typeId = dto.typeId ?? expense.typeId;
        const type = await this.assertKnownType(typeId);
        const name = type.requiresName ? (dto.name ?? expense.name) : null;
        if (type.requiresName && !name) {
            throw new common_1.BadRequestException('name is required for the "Інше" expense type');
        }
        const updated = await this.prisma.expense.update({
            where: { id },
            data: {
                typeId,
                name,
                ...(dto.amount !== undefined && { amount: dto.amount }),
            },
        });
        return this.toResponseDto(updated);
    }
    async remove(id) {
        await this.findOrThrow(id);
        await this.prisma.expense.delete({ where: { id } });
    }
    async assertKnownType(typeId) {
        const type = await this.prisma.expenseType.findUnique({
            where: { id: typeId },
        });
        if (!type) {
            throw new common_1.BadRequestException('Unknown expense type');
        }
        return type;
    }
    async findOrThrow(id) {
        const expense = await this.prisma.expense.findUnique({ where: { id } });
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found');
        }
        return expense;
    }
    toResponseDto(expense) {
        return {
            id: expense.id,
            typeId: expense.typeId,
            name: expense.name,
            amount: expense.amount,
            createdAt: expense.createdAt,
            updatedAt: expense.updatedAt,
        };
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map