import { ConfigService } from '@nestjs/config';
export interface CloudinaryUploadResult {
    secureUrl: string;
    publicId: string;
}
export declare class CloudinaryService {
    private readonly configService;
    constructor(configService: ConfigService);
    uploadImage(file: Buffer, folder: string): Promise<CloudinaryUploadResult>;
    deleteImage(publicId: string): Promise<void>;
}
