import { Module } from '@nestjs/common';
import { SendersController } from './senders.controller';
import { SendersService } from './senders.service';
import { EncryptionModule } from '../shared/encryption/encryption.module';
import { NovaPoshtaModule } from '../nova-poshta/nova-poshta.module';

@Module({
  imports: [EncryptionModule, NovaPoshtaModule],
  controllers: [SendersController],
  providers: [SendersService],
})
export class SendersModule {}
