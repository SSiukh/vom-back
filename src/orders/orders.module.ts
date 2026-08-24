import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { EncryptionModule } from '../shared/encryption/encryption.module';
import { NovaPoshtaModule } from '../nova-poshta/nova-poshta.module';

@Module({
  imports: [EncryptionModule, NovaPoshtaModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
