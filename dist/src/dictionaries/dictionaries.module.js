"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DictionariesModule = void 0;
const common_1 = require("@nestjs/common");
const dictionaries_controller_1 = require("./dictionaries.controller");
const dictionaries_service_1 = require("./dictionaries.service");
let DictionariesModule = class DictionariesModule {
};
exports.DictionariesModule = DictionariesModule;
exports.DictionariesModule = DictionariesModule = __decorate([
    (0, common_1.Module)({
        controllers: [dictionaries_controller_1.DictionariesController],
        providers: [dictionaries_service_1.DictionariesService],
        exports: [dictionaries_service_1.DictionariesService],
    })
], DictionariesModule);
//# sourceMappingURL=dictionaries.module.js.map