import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { ListExpensesResponseDto } from './dto/list-expenses-response.dto';
export declare class ExpensesController {
    private readonly expensesService;
    constructor(expensesService: ExpensesService);
    create(dto: CreateExpenseDto): Promise<ExpenseResponseDto>;
    findAll(query: ListExpensesQueryDto): Promise<ListExpensesResponseDto>;
    findOne(id: string): Promise<ExpenseResponseDto>;
    update(id: string, dto: UpdateExpenseDto): Promise<ExpenseResponseDto>;
    remove(id: string): Promise<void>;
}
