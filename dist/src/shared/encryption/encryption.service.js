"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_HEX_PATTERN = /^[0-9a-fA-F]{64}$/;
let EncryptionService = class EncryptionService {
    configService;
    key;
    constructor(configService) {
        this.configService = configService;
        const hexKey = this.configService.get('ENCRYPTION_KEY');
        if (!hexKey || !KEY_HEX_PATTERN.test(hexKey)) {
            throw new Error('ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)');
        }
        this.key = Buffer.from(hexKey, 'hex');
    }
    encrypt(plaintext) {
        const iv = (0, crypto_1.randomBytes)(IV_LENGTH);
        const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, this.key, iv);
        const ciphertext = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();
        return [iv, authTag, ciphertext]
            .map((part) => part.toString('hex'))
            .join(':');
    }
    decrypt(payload) {
        const [ivHex, authTagHex, ciphertextHex] = payload.split(':');
        if (!ivHex || !authTagHex || !ciphertextHex) {
            throw new Error('Invalid encrypted payload format');
        }
        const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, this.key, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(ciphertextHex, 'hex')),
            decipher.final(),
        ]);
        return plaintext.toString('utf8');
    }
};
exports.EncryptionService = EncryptionService;
exports.EncryptionService = EncryptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EncryptionService);
//# sourceMappingURL=encryption.service.js.map