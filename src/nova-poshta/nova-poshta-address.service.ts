import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import { NovaPoshtaService } from './nova-poshta.service';
import { AddressOptionDto } from './dto/address-option.dto';

@Injectable()
export class NovaPoshtaAddressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly novaPoshta: NovaPoshtaService,
  ) {}

  async searchCities(query: string): Promise<AddressOptionDto[]> {
    const apiKey = await this.resolveActiveSenderApiKey();
    const cities = await this.novaPoshta.searchCities(apiKey, query);

    return cities.map((city) => ({
      ref: city.ref,
      description: city.description,
    }));
  }

  async getWarehouses(cityRef: string): Promise<AddressOptionDto[]> {
    const apiKey = await this.resolveActiveSenderApiKey();
    const warehouses = await this.novaPoshta.getWarehouses(apiKey, cityRef);

    return warehouses.map((warehouse) => ({
      ref: warehouse.ref,
      description: warehouse.description,
    }));
  }

  async getStreets(
    cityRef: string,
    query?: string,
  ): Promise<AddressOptionDto[]> {
    const apiKey = await this.resolveActiveSenderApiKey();
    const streets = await this.novaPoshta.getStreets(apiKey, cityRef, query);

    return streets.map((street) => ({
      ref: street.ref,
      description: street.description,
    }));
  }

  async getPostomats(cityRef: string): Promise<AddressOptionDto[]> {
    const apiKey = await this.resolveActiveSenderApiKey();
    const postomats = await this.novaPoshta.getPostomats(apiKey, cityRef);

    return postomats.map((postomat) => ({
      ref: postomat.ref,
      description: postomat.description,
    }));
  }

  private async resolveActiveSenderApiKey(): Promise<string> {
    const sender = await this.prisma.sender.findFirst({
      where: { isActive: true, isDeactivated: false },
    });

    if (!sender) {
      throw new BadRequestException('No active sender configured');
    }

    return this.encryption.decrypt(sender.apiKey);
  }
}
