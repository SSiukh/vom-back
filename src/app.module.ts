import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { SendersModule } from './senders/senders.module';
import { DictionariesModule } from './dictionaries/dictionaries.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { NovaPoshtaModule } from './nova-poshta/nova-poshta.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CrmModule } from './crm/crm.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    CoreModule,
    SendersModule,
    DictionariesModule,
    ProductsModule,
    OrdersModule,
    NovaPoshtaModule,
    ExpensesModule,
    CrmModule,
    DashboardModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
