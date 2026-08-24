import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { ListExpensesResponseDto } from './dto/list-expenses-response.dto';
export declare class ExpensesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateExpenseDto): Promise<ExpenseResponseDto>;
    findAll(page: number, pageSize: number): Promise<ListExpensesResponseDto>;
    findOne(id: string): Promise<ExpenseResponseDto>;
    update(id: string, dto: UpdateExpenseDto): Promise<ExpenseResponseDto>;
    remove(id: string): Promise<void>;
    private assertKnownType;
    private findOrThrow;
    private toResponseDto;
}
