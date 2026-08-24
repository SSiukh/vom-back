import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: {
    expense: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    expenseType: { findUnique: jest.Mock };
  };

  const plainType = {
    id: 'delivery-type-id',
    code: 'delivery',
    label: 'Доставка',
    requiresName: false,
  };
  const otherType = {
    id: 'other-type-id',
    code: 'other',
    label: 'Інше',
    requiresName: true,
  };

  const storedExpense = {
    id: 'expense-id',
    typeId: plainType.id,
    name: null,
    amount: 150,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      expense: {
        create: jest.fn().mockResolvedValue(storedExpense),
        findMany: jest.fn().mockResolvedValue([storedExpense]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(storedExpense),
        update: jest.fn().mockResolvedValue(storedExpense),
        delete: jest.fn().mockResolvedValue(storedExpense),
      },
      expenseType: {
        findUnique: jest.fn().mockResolvedValue(plainType),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ExpensesService);
  });

  describe('create', () => {
    it('rejects an unknown expense type', async () => {
      prisma.expenseType.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ typeId: 'missing', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires a name for the "Інше" (requiresName) expense type', async () => {
      prisma.expenseType.findUnique.mockResolvedValueOnce(otherType);

      await expect(
        service.create({ typeId: otherType.id, amount: 100 }),
      ).rejects.toThrow('name is required');
    });

    it('stores the name for the "Інше" expense type', async () => {
      prisma.expenseType.findUnique.mockResolvedValueOnce(otherType);

      await service.create({
        typeId: otherType.id,
        name: 'Оренда',
        amount: 100,
      });

      const [[{ data }]] = prisma.expense.create.mock.calls as [
        [{ data: { name: string | null } }],
      ];
      expect(data.name).toBe('Оренда');
    });

    it('ignores a client-supplied name for a type that does not require one', async () => {
      await service.create({
        typeId: plainType.id,
        name: 'Should be ignored',
        amount: 100,
      });

      const [[{ data }]] = prisma.expense.create.mock.calls as [
        [{ data: { name: string | null } }],
      ];
      expect(data.name).toBeNull();
    });
  });

  describe('findAll', () => {
    it('paginates expenses ordered by createdAt desc', async () => {
      await service.findAll(2, 10);

      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for a missing expense', async () => {
      prisma.expense.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the mapped expense', async () => {
      const result = await service.findOne('expense-id');

      expect(result.id).toBe('expense-id');
    });
  });

  describe('update', () => {
    it('throws NotFoundException for a missing expense', async () => {
      prisma.expense.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.update('missing-id', { amount: 200 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an unknown expense type', async () => {
      prisma.expenseType.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.update('expense-id', { typeId: 'missing' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires a name when switching to the "Інше" expense type', async () => {
      prisma.expenseType.findUnique.mockResolvedValueOnce(otherType);

      await expect(
        service.update('expense-id', { typeId: otherType.id }),
      ).rejects.toThrow('name is required');
    });

    it('nulls out the name when switching away from "Інше"', async () => {
      prisma.expense.findUnique.mockResolvedValueOnce({
        ...storedExpense,
        typeId: otherType.id,
        name: 'Стара назва',
      });

      await service.update('expense-id', { typeId: plainType.id });

      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: 'expense-id' },
        data: { typeId: plainType.id, name: null },
      });
    });

    it('keeps the existing name when only amount changes for a "requiresName" expense', async () => {
      prisma.expense.findUnique.mockResolvedValueOnce({
        ...storedExpense,
        typeId: otherType.id,
        name: 'Оренда',
      });
      prisma.expenseType.findUnique.mockResolvedValueOnce(otherType);

      await service.update('expense-id', { amount: 250 });

      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: 'expense-id' },
        data: { typeId: otherType.id, name: 'Оренда', amount: 250 },
      });
    });
  });

  describe('remove', () => {
    it('deletes the expense', async () => {
      await service.remove('expense-id');

      expect(prisma.expense.delete).toHaveBeenCalledWith({
        where: { id: 'expense-id' },
      });
    });

    it('throws NotFoundException when removing a missing expense', async () => {
      prisma.expense.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
