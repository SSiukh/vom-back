import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import { NovaPoshtaService } from './nova-poshta.service';
import { NovaPoshtaAddressService } from './nova-poshta-address.service';

describe('NovaPoshtaAddressService', () => {
  let service: NovaPoshtaAddressService;
  let prisma: { sender: { findFirst: jest.Mock } };
  let encryption: { decrypt: jest.Mock };
  let novaPoshta: {
    searchCities: jest.Mock;
    getWarehouses: jest.Mock;
    getStreets: jest.Mock;
    getPostomats: jest.Mock;
  };

  const activeSender = {
    id: 'sender-id',
    apiKey: 'encrypted-key',
    isActive: true,
    isDeactivated: false,
  };

  beforeEach(async () => {
    prisma = {
      sender: { findFirst: jest.fn().mockResolvedValue(activeSender) },
    };
    encryption = { decrypt: jest.fn().mockReturnValue('decrypted-api-key') };
    novaPoshta = {
      searchCities: jest
        .fn()
        .mockResolvedValue([{ ref: 'city-ref', description: 'Київ' }]),
      getWarehouses: jest.fn().mockResolvedValue([]),
      getStreets: jest.fn().mockResolvedValue([]),
      getPostomats: jest.fn().mockResolvedValue([]),
    };

    const module = await Test.createTestingModule({
      providers: [
        NovaPoshtaAddressService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
        { provide: NovaPoshtaService, useValue: novaPoshta },
      ],
    }).compile();

    service = module.get(NovaPoshtaAddressService);
  });

  it('resolves the active, non-deactivated sender and decrypts its api key', async () => {
    await service.searchCities('Київ');

    expect(prisma.sender.findFirst).toHaveBeenCalledWith({
      where: { isActive: true, isDeactivated: false },
    });
    expect(encryption.decrypt).toHaveBeenCalledWith('encrypted-key');
    expect(novaPoshta.searchCities).toHaveBeenCalledWith(
      'decrypted-api-key',
      'Київ',
    );
  });

  it('throws when there is no active sender', async () => {
    prisma.sender.findFirst.mockResolvedValueOnce(null);

    await expect(service.searchCities('Київ')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('delegates getWarehouses/getStreets/getPostomats with the resolved key', async () => {
    await service.getWarehouses('city-ref');
    await service.getStreets('city-ref', 'вул');
    await service.getPostomats('city-ref');

    expect(novaPoshta.getWarehouses).toHaveBeenCalledWith(
      'decrypted-api-key',
      'city-ref',
    );
    expect(novaPoshta.getStreets).toHaveBeenCalledWith(
      'decrypted-api-key',
      'city-ref',
      'вул',
    );
    expect(novaPoshta.getPostomats).toHaveBeenCalledWith(
      'decrypted-api-key',
      'city-ref',
    );
  });
});
