import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import { NovaPoshtaService } from '../nova-poshta/nova-poshta.service';
import { VerifySenderDto } from './dto/verify-sender.dto';
import { CreateSenderDto } from './dto/create-sender.dto';
import { SetSenderWarehouseDto } from './dto/set-sender-warehouse.dto';
import { SenderVerificationResultDto } from './dto/sender-verification-result.dto';
import { SenderResponseDto } from './dto/sender-response.dto';
import { ListSendersResponseDto } from './dto/list-senders-response.dto';
import { SenderAddressResponseDto } from './dto/sender-address-response.dto';
export declare class SendersService {
    private readonly prisma;
    private readonly encryption;
    private readonly novaPoshta;
    constructor(prisma: PrismaService, encryption: EncryptionService, novaPoshta: NovaPoshtaService);
    verify(dto: VerifySenderDto): Promise<SenderVerificationResultDto>;
    create(dto: CreateSenderDto): Promise<SenderResponseDto>;
    findAll(page: number, pageSize: number): Promise<ListSendersResponseDto>;
    findAddresses(id: string): Promise<SenderAddressResponseDto[]>;
    activate(id: string): Promise<SenderResponseDto>;
    refresh(id: string): Promise<SenderResponseDto>;
    setWarehouse(id: string, dto: SetSenderWarehouseDto): Promise<SenderResponseDto>;
    deactivate(id: string): Promise<void>;
    private resolveWarehouse;
    private findActiveOrThrow;
    private toResponseDto;
}
