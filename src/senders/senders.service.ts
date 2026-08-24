import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import {
  NovaPoshtaService,
  SenderAddressOption,
} from '../nova-poshta/nova-poshta.service';
import { VerifySenderDto } from './dto/verify-sender.dto';
import { CreateSenderDto } from './dto/create-sender.dto';
import { SenderVerificationResultDto } from './dto/sender-verification-result.dto';
import { SenderResponseDto } from './dto/sender-response.dto';
import { ListSendersResponseDto } from './dto/list-senders-response.dto';
import { SenderAddressResponseDto } from './dto/sender-address-response.dto';
import { Sender } from './entities/sender.entity';

interface StoredAddress {
  npAddressRef: string;
  description: string;
  cityRef: string;
  isDeactivated: boolean;
}

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
    const addresses = await this.novaPoshta.getSenderAddresses(
      dto.apiKey,
      verified.counterpartyRef,
    );

    const sender = await this.prisma.sender.create({
      data: {
        apiKey: this.encryption.encrypt(dto.apiKey),
        fullName: verified.fullName,
        phone: verified.phone,
        npCounterpartyRef: verified.counterpartyRef,
        npContactPersonRef: verified.contactPersonRef,
        addresses: this.mergeAddresses([], addresses),
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
    const addresses = await this.novaPoshta.getSenderAddresses(
      apiKey,
      verified.counterpartyRef,
    );

    const updated = await this.prisma.sender.update({
      where: { id: sender.id },
      data: {
        fullName: verified.fullName,
        phone: verified.phone,
        npCounterpartyRef: verified.counterpartyRef,
        npContactPersonRef: verified.contactPersonRef,
        addresses: this.mergeAddresses(sender.addresses, addresses),
      },
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

  private mergeAddresses(
    existing: StoredAddress[],
    fetched: SenderAddressOption[],
  ): StoredAddress[] {
    const existingByRef = new Map(
      existing.map((address) => [address.npAddressRef, address]),
    );

    return fetched.map((address) => ({
      npAddressRef: address.ref,
      description: address.description,
      cityRef: address.cityRef,
      isDeactivated: existingByRef.get(address.ref)?.isDeactivated ?? false,
    }));
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
