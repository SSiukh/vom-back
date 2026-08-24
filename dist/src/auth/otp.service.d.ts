export interface TotpVerifyResult {
    valid: boolean;
}
export declare class OtpService {
    generateSecret(): Promise<string>;
    generateUri(params: {
        issuer: string;
        label: string;
        secret: string;
    }): Promise<string>;
    verify(params: {
        secret: string;
        token: string;
        epochTolerance: number;
    }): Promise<TotpVerifyResult>;
    private loadOtplib;
}
