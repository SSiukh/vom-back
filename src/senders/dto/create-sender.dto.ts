import { IntersectionType } from '@nestjs/swagger';
import { VerifySenderDto } from './verify-sender.dto';
import { SetSenderWarehouseDto } from './set-sender-warehouse.dto';

export class CreateSenderDto extends IntersectionType(
  VerifySenderDto,
  SetSenderWarehouseDto,
) {}
