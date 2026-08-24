import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { ListExpensesResponseDto } from './dto/list-expenses-response.dto';
import { Expense } from './entities/expense.entity';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseDto): Promise<ExpenseResponseDto> {
    const type = await this.assertKnownType(dto.typeId);

    if (type.requiresName && !dto.name) {
      throw new BadRequestException(
        'name is required for the "Інше" expense type',
      );
    }

    const expense = await this.prisma.expense.create({
      data: {
        typeId: dto.typeId,
        name: type.requiresName ? (dto.name as string) : null,
        amount: dto.amount,
      },
    });

    return this.toResponseDto(expense);
  }

  async findAll(
    page: number,
    pageSize: number,
  ): Promise<ListExpensesResponseDto> {
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

  async findOne(id: string): Promise<ExpenseResponseDto> {
    const expense = await this.findOrThrow(id);

    return this.toResponseDto(expense);
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<ExpenseResponseDto> {
    const expense = await this.findOrThrow(id);
    const typeId = dto.typeId ?? expense.typeId;
    const type = await this.assertKnownType(typeId);

    const name = type.requiresName ? (dto.name ?? expense.name) : null;
    if (type.requiresName && !name) {
      throw new BadRequestException(
        'name is required for the "Інше" expense type',
      );
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

  async remove(id: string): Promise<void> {
    await this.findOrThrow(id);

    await this.prisma.expense.delete({ where: { id } });
  }

  private async assertKnownType(typeId: string): Promise<ExpenseType> {
    const type = await this.prisma.expenseType.findUnique({
      where: { id: typeId },
    });

    if (!type) {
      throw new BadRequestException('Unknown expense type');
    }

    return type;
  }

  private async findOrThrow(id: string): Promise<Expense> {
    const expense = await this.prisma.expense.findUnique({ where: { id } });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  private toResponseDto(expense: Expense): ExpenseResponseDto {
    return {
      id: expense.id,
      typeId: expense.typeId,
      name: expense.name,
      amount: expense.amount,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }
}
