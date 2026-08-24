import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import { NovaPoshtaService } from './nova-poshta.service';
import { AddressOptionDto } from './dto/address-option.dto';
export declare class NovaPoshtaAddressService {
    private readonly prisma;
    private readonly encryption;
    private readonly novaPoshta;
    constructor(prisma: PrismaService, encryption: EncryptionService, novaPoshta: NovaPoshtaService);
    searchCities(query: string): Promise<AddressOptionDto[]>;
    getWarehouses(cityRef: string): Promise<AddressOptionDto[]>;
    getStreets(cityRef: string, query?: string): Promise<AddressOptionDto[]>;
    getPostomats(cityRef: string): Promise<AddressOptionDto[]>;
    private resolveActiveSenderApiKey;
}
