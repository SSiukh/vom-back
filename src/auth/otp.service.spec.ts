import { loadEsm } from 'load-esm';
import { OtpService } from './otp.service';

jest.mock('load-esm');

describe('OtpService', () => {
  let service: OtpService;
  let otplib: {
    generateSecret: jest.Mock;
    generateURI: jest.Mock;
    verify: jest.Mock;
  };

  beforeEach(() => {
    otplib = {
      generateSecret: jest.fn().mockReturnValue('raw-secret'),
      generateURI: jest.fn().mockReturnValue('otpauth://totp/test'),
      verify: jest.fn().mockResolvedValue({ valid: true }),
    };
    (loadEsm as jest.Mock).mockResolvedValue(otplib);

    service = new OtpService();
  });

  it('generates a secret via the loaded otplib module', async () => {
    const result = await service.generateSecret();

    expect(loadEsm).toHaveBeenCalledWith('otplib');
    expect(otplib.generateSecret).toHaveBeenCalled();
    expect(result).toBe('raw-secret');
  });

  it('builds an otpauth URI via the loaded otplib module', async () => {
    const result = await service.generateUri({
      issuer: 'VOM Systems',
      label: 'admin',
      secret: 'raw-secret',
    });

    expect(otplib.generateURI).toHaveBeenCalledWith({
      issuer: 'VOM Systems',
      label: 'admin',
      secret: 'raw-secret',
    });
    expect(result).toBe('otpauth://totp/test');
  });

  it('verifies a TOTP code via the loaded otplib module', async () => {
    const result = await service.verify({
      secret: 'raw-secret',
      token: '123456',
      epochTolerance: 30,
    });

    expect(otplib.verify).toHaveBeenCalledWith({
      secret: 'raw-secret',
      token: '123456',
      epochTolerance: 30,
    });
    expect(result).toEqual({ valid: true });
  });
});
