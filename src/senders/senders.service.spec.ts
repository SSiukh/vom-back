import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import { NovaPoshtaService } from '../nova-poshta/nova-poshta.service';
import { SendersService } from './senders.service';

describe('SendersService', () => {
  let service: SendersService;
  let prisma: {
    sender: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let encryption: { encrypt: jest.Mock; decrypt: jest.Mock };
  let novaPoshta: { verifySender: jest.Mock; getSenderAddresses: jest.Mock };

  const verifiedResult = {
    counterpartyRef: 'counterparty-ref',
    contactPersonRef: 'contact-person-ref',
    fullName: 'Іваненко Іван Іванович',
    phone: '380501234567',
  };

  const fetchedAddresses = [
    {
      ref: 'address-ref-1',
      description: 'Луцьк, вул. Молоді, 8а',
      cityRef: 'lutsk-city-ref',
    },
  ];

  const storedSender = {
    id: 'sender-id',
    apiKey: 'encrypted-key',
    fullName: verifiedResult.fullName,
    phone: verifiedResult.phone,
    npCounterpartyRef: verifiedResult.counterpartyRef,
    npContactPersonRef: verifiedResult.contactPersonRef,
    addresses: [
      {
        npAddressRef: 'address-ref-1',
        description: 'Луцьк, вул. Молоді, 8а',
        cityRef: 'lutsk-city-ref',
        isDeactivated: false,
      },
      {
        npAddressRef: 'address-ref-2',
        description: 'Стара адреса',
        cityRef: 'other-city-ref',
        isDeactivated: true,
      },
    ],
    isActive: false,
    isDeactivated: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      sender: {
        create: jest.fn().mockResolvedValue(storedSender),
        findMany: jest.fn().mockResolvedValue([storedSender]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(storedSender),
        update: jest.fn().mockResolvedValue(storedSender),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest
        .fn()
        .mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    encryption = {
      encrypt: jest.fn().mockReturnValue('encrypted-key'),
      decrypt: jest.fn().mockReturnValue('decrypted-api-key'),
    };
    novaPoshta = {
      verifySender: jest.fn().mockResolvedValue(verifiedResult),
      getSenderAddresses: jest.fn().mockResolvedValue(fetchedAddresses),
    };

    const module = await Test.createTestingModule({
      providers: [
        SendersService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
        { provide: NovaPoshtaService, useValue: novaPoshta },
      ],
    }).compile();

    service = module.get(SendersService);
  });

  describe('verify', () => {
    it('returns only fullName/phone, never the Nova Poshta refs', async () => {
      const result = await service.verify({ apiKey: 'raw-key' });

      expect(novaPoshta.verifySender).toHaveBeenCalledWith('raw-key');
      expect(result).toEqual({
        fullName: verifiedResult.fullName,
        phone: verifiedResult.phone,
      });
    });
  });

  describe('create', () => {
    it('never stores the raw API key — always the encrypted form', async () => {
      await service.create({ apiKey: 'raw-key' });

      expect(encryption.encrypt).toHaveBeenCalledWith('raw-key');
      const [[{ data }]] = prisma.sender.create.mock.calls as [
        [{ data: { apiKey: string } }],
      ];
      expect(data.apiKey).toBe('encrypted-key');
    });

    it('takes fullName/phone from Nova Poshta, not from client input', async () => {
      await service.create({ apiKey: 'raw-key' });

      const [[{ data }]] = prisma.sender.create.mock.calls as [
        [{ data: { fullName: string; phone: string } }],
      ];
      expect(data.fullName).toBe(verifiedResult.fullName);
      expect(data.phone).toBe(verifiedResult.phone);
    });

    it('caches the sender addresses fetched from Nova Poshta', async () => {
      await service.create({ apiKey: 'raw-key' });

      expect(novaPoshta.getSenderAddresses).toHaveBeenCalledWith(
        'raw-key',
        verifiedResult.counterpartyRef,
      );
      const [[{ data }]] = prisma.sender.create.mock.calls as [
        [
          {
            data: {
              addresses: {
                npAddressRef: string;
                description: string;
                cityRef: string;
                isDeactivated: boolean;
              }[];
            };
          },
        ],
      ];
      expect(data.addresses).toEqual([
        {
          npAddressRef: 'address-ref-1',
          description: 'Луцьк, вул. Молоді, 8а',
          cityRef: 'lutsk-city-ref',
          isDeactivated: false,
        },
      ]);
    });
  });

  describe('findAll', () => {
    it('only queries non-deactivated senders', async () => {
      await service.findAll(1, 10);

      expect(prisma.sender.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isDeactivated: false } }),
      );
      expect(prisma.sender.count).toHaveBeenCalledWith({
        where: { isDeactivated: false },
      });
    });
  });

  describe('findAddresses', () => {
    it('returns only the non-deactivated cached addresses', async () => {
      const result = await service.findAddresses('sender-id');

      expect(result).toEqual([
        {
          npAddressRef: 'address-ref-1',
          description: 'Луцьк, вул. Молоді, 8а',
        },
      ]);
    });

    it('throws NotFoundException for a missing/deactivated sender', async () => {
      prisma.sender.findFirst.mockResolvedValueOnce(null);

      await expect(service.findAddresses('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activate', () => {
    it('unsets every other active sender in the same transaction', async () => {
      await service.activate('sender-id');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.sender.updateMany).toHaveBeenCalledWith({
        where: { isActive: true },
        data: { isActive: false },
      });
    });

    it('throws if the sender does not exist or is deactivated', async () => {
      prisma.sender.findFirst.mockResolvedValueOnce(null);

      await expect(service.activate('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refresh', () => {
    it('decrypts the stored key and re-verifies against Nova Poshta', async () => {
      await service.refresh('sender-id');

      expect(encryption.decrypt).toHaveBeenCalledWith(storedSender.apiKey);
      expect(novaPoshta.verifySender).toHaveBeenCalledWith('decrypted-api-key');
    });

    it('re-fetches addresses and preserves isDeactivated for ones already flagged', async () => {
      novaPoshta.getSenderAddresses.mockResolvedValueOnce([
        {
          ref: 'address-ref-1',
          description: 'Оновлений опис',
          cityRef: 'lutsk-city-ref',
        },
        {
          ref: 'address-ref-2',
          description: 'Стара адреса',
          cityRef: 'other-city-ref',
        },
      ]);

      await service.refresh('sender-id');

      const [[{ data }]] = prisma.sender.update.mock.calls as [
        [
          {
            data: {
              addresses: {
                npAddressRef: string;
                description: string;
                cityRef: string;
                isDeactivated: boolean;
              }[];
            };
          },
        ],
      ];
      expect(data.addresses).toEqual([
        {
          npAddressRef: 'address-ref-1',
          description: 'Оновлений опис',
          cityRef: 'lutsk-city-ref',
          isDeactivated: false,
        },
        {
          npAddressRef: 'address-ref-2',
          description: 'Стара адреса',
          cityRef: 'other-city-ref',
          isDeactivated: true,
        },
      ]);
    });
  });

  describe('deactivate', () => {
    it('flips isDeactivated and clears isActive instead of deleting', async () => {
      await service.deactivate('sender-id');

      expect(prisma.sender.update).toHaveBeenCalledWith({
        where: { id: 'sender-id' },
        data: { isActive: false, isDeactivated: true },
      });
    });
  });
});
