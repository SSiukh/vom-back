import { Module } from '@nestjs/common';
import { NovaPoshtaController } from './nova-poshta.controller';
import { NovaPoshtaService } from './nova-poshta.service';
import { NovaPoshtaAddressService } from './nova-poshta-address.service';
import { EncryptionModule } from '../shared/encryption/encryption.module';

@Module({
  imports: [EncryptionModule],
  controllers: [NovaPoshtaController],
  providers: [NovaPoshtaService, NovaPoshtaAddressService],
  exports: [NovaPoshtaService],
})
export class NovaPoshtaModule {}
