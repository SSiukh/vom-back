import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SenderAddress } from '@prisma/client';
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
import { Sender } from './entities/sender.entity';

@Injectable()
export class SendersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly novaPoshta: NovaPoshtaService,
  ) {}

  async verify(dto: VerifySenderDto): Promise<SenderVerificationResultDto> {
    const verified = await this.novaPoshta.verifySender(dto.apiKey);

    return { fullName: verified.fullName, phone: verified.phone };
  }

  async create(dto: CreateSenderDto): Promise<SenderResponseDto> {
    const verified = await this.novaPoshta.verifySender(dto.apiKey);
    const addresses =
      dto.cityRef && dto.warehouseRef
        ? [
            await this.resolveWarehouse(
              dto.apiKey,
              dto.cityRef,
              dto.warehouseRef,
            ),
          ]
        : [];

    const sender = await this.prisma.sender.create({
      data: {
        apiKey: this.encryption.encrypt(dto.apiKey),
        fullName: verified.fullName,
        phone: verified.phone,
        npCounterpartyRef: verified.counterpartyRef,
        npContactPersonRef: verified.contactPersonRef,
        addresses,
        isActive: false,
        isDeactivated: false,
      },
    });

    return this.toResponseDto(sender);
  }

  async findAll(
    page: number,
    pageSize: number,
  ): Promise<ListSendersResponseDto> {
    const where = { isDeactivated: false };

    const [senders, total] = await Promise.all([
      this.prisma.sender.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sender.count({ where }),
    ]);

    return {
      items: senders.map((sender) => this.toResponseDto(sender)),
      total,
    };
  }

  async findAddresses(id: string): Promise<SenderAddressResponseDto[]> {
    const sender = await this.findActiveOrThrow(id);

    return sender.addresses
      .filter((address) => !address.isDeactivated)
      .map((address) => ({
        npAddressRef: address.npAddressRef,
        description: address.description,
      }));
  }

  async activate(id: string): Promise<SenderResponseDto> {
    const sender = await this.findActiveOrThrow(id);

    const [, updated] = await this.prisma.$transaction([
      this.prisma.sender.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      this.prisma.sender.update({
        where: { id: sender.id },
        data: { isActive: true },
      }),
    ]);

    return this.toResponseDto(updated);
  }

  async refresh(id: string): Promise<SenderResponseDto> {
    const sender = await this.findActiveOrThrow(id);
    const apiKey = this.encryption.decrypt(sender.apiKey);
    const verified = await this.novaPoshta.verifySender(apiKey);

    const updated = await this.prisma.sender.update({
      where: { id: sender.id },
      data: {
        fullName: verified.fullName,
        phone: verified.phone,
        npCounterpartyRef: verified.counterpartyRef,
        npContactPersonRef: verified.contactPersonRef,
      },
    });

    return this.toResponseDto(updated);
  }

  async setWarehouse(
    id: string,
    dto: SetSenderWarehouseDto,
  ): Promise<SenderResponseDto> {
    const sender = await this.findActiveOrThrow(id);
    const apiKey = this.encryption.decrypt(sender.apiKey);
    const address = await this.resolveWarehouse(
      apiKey,
      dto.cityRef,
      dto.warehouseRef,
    );

    const updated = await this.prisma.sender.update({
      where: { id: sender.id },
      data: { addresses: [address] },
    });

    return this.toResponseDto(updated);
  }

  async deactivate(id: string): Promise<void> {
    const sender = await this.findActiveOrThrow(id);

    await this.prisma.sender.update({
      where: { id: sender.id },
      data: { isActive: false, isDeactivated: true },
    });
  }

  private async resolveWarehouse(
    apiKey: string,
    cityRef: string,
    warehouseRef: string,
  ): Promise<SenderAddress> {
    const warehouses = await this.novaPoshta.getWarehouses(apiKey, cityRef);
    const warehouse = warehouses.find((option) => option.ref === warehouseRef);
    if (!warehouse) {
      throw new BadRequestException(
        'Unknown warehouse for the given city — verify cityRef/warehouseRef against GET /nova-poshta/warehouses',
      );
    }

    return {
      npAddressRef: warehouse.ref,
      description: warehouse.description,
      cityRef,
      isDeactivated: false,
    };
  }

  private async findActiveOrThrow(id: string): Promise<Sender> {
    const sender = await this.prisma.sender.findFirst({
      where: { id, isDeactivated: false },
    });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    return sender;
  }

  private toResponseDto(sender: Sender): SenderResponseDto {
    return {
      id: sender.id,
      fullName: sender.fullName,
      phone: sender.phone,
      isActive: sender.isActive,
      createdAt: sender.createdAt,
      updatedAt: sender.updatedAt,
    };
  }
}
