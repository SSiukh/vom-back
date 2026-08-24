"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const load_esm_1 = require("load-esm");
let OtpService = class OtpService {
    generateSecret() {
        return this.loadOtplib().then((otplib) => otplib.generateSecret());
    }
    generateUri(params) {
        return this.loadOtplib().then((otplib) => otplib.generateURI(params));
    }
    verify(params) {
        return this.loadOtplib().then((otplib) => otplib.verify(params));
    }
    loadOtplib() {
        return (0, load_esm_1.loadEsm)('otplib');
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)()
], OtpService);
//# sourceMappingURL=otp.service.js.map