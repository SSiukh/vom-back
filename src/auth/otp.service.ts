import { Injectable } from '@nestjs/common';
import { loadEsm } from 'load-esm';
import type * as Otplib from 'otplib';

export interface TotpVerifyResult {
  valid: boolean;
}

@Injectable()
export class OtpService {
  generateSecret(): Promise<string> {
    return this.loadOtplib().then((otplib) => otplib.generateSecret());
  }

  generateUri(params: {
    issuer: string;
    label: string;
    secret: string;
  }): Promise<string> {
    return this.loadOtplib().then((otplib) => otplib.generateURI(params));
  }

  verify(params: {
    secret: string;
    token: string;
    epochTolerance: number;
  }): Promise<TotpVerifyResult> {
    return this.loadOtplib().then((otplib) => otplib.verify(params));
  }

  private loadOtplib(): Promise<typeof Otplib> {
    return loadEsm<typeof Otplib>('otplib');
  }
}
