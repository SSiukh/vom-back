import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('a'.repeat(64)) },
        },
      ],
    }).compile();

    service = module.get(EncryptionService);
  });

  it('decrypts what it encrypted', () => {
    const ciphertext = service.encrypt('super-secret-value');

    expect(service.decrypt(ciphertext)).toBe('super-secret-value');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const first = service.encrypt('same-value');
    const second = service.encrypt('same-value');

    expect(first).not.toBe(second);
  });

  it('throws on a tampered payload', () => {
    const ciphertext = service.encrypt('value');
    const tampered = `${ciphertext.slice(0, -2)}00`;

    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('throws at construction if ENCRYPTION_KEY is missing or the wrong length', () => {
    const badConfigService = {
      get: jest.fn().mockReturnValue('too-short'),
    } as unknown as ConfigService;

    expect(() => new EncryptionService(badConfigService)).toThrow();
  });
});
