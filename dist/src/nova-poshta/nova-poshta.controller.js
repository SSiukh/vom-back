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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NovaPoshtaController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const nova_poshta_address_service_1 = require("./nova-poshta-address.service");
const search_cities_query_dto_1 = require("./dto/search-cities-query.dto");
const city_ref_query_dto_1 = require("./dto/city-ref-query.dto");
const search_streets_query_dto_1 = require("./dto/search-streets-query.dto");
const ADDRESS_LOOKUP_THROTTLE_TTL_MS = 60_000;
const ADDRESS_LOOKUP_THROTTLE_LIMIT = 30;
let NovaPoshtaController = class NovaPoshtaController {
    addressService;
    constructor(addressService) {
        this.addressService = addressService;
    }
    searchCities(query) {
        return this.addressService.searchCities(query.query);
    }
    getWarehouses(query) {
        return this.addressService.getWarehouses(query.cityRef);
    }
    getStreets(query) {
        return this.addressService.getStreets(query.cityRef, query.query);
    }
    getPostomats(query) {
        return this.addressService.getPostomats(query.cityRef);
    }
};
exports.NovaPoshtaController = NovaPoshtaController;
__decorate([
    (0, common_1.Get)('cities'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_cities_query_dto_1.SearchCitiesQueryDto]),
    __metadata("design:returntype", Promise)
], NovaPoshtaController.prototype, "searchCities", null);
__decorate([
    (0, common_1.Get)('warehouses'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [city_ref_query_dto_1.CityRefQueryDto]),
    __metadata("design:returntype", Promise)
], NovaPoshtaController.prototype, "getWarehouses", null);
__decorate([
    (0, common_1.Get)('streets'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_streets_query_dto_1.SearchStreetsQueryDto]),
    __metadata("design:returntype", Promise)
], NovaPoshtaController.prototype, "getStreets", null);
__decorate([
    (0, common_1.Get)('postomats'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [city_ref_query_dto_1.CityRefQueryDto]),
    __metadata("design:returntype", Promise)
], NovaPoshtaController.prototype, "getPostomats", null);
exports.NovaPoshtaController = NovaPoshtaController = __decorate([
    (0, swagger_1.ApiTags)('nova-poshta'),
    (0, throttler_1.Throttle)({
        default: {
            limit: ADDRESS_LOOKUP_THROTTLE_LIMIT,
            ttl: ADDRESS_LOOKUP_THROTTLE_TTL_MS,
        },
    }),
    (0, common_1.Controller)('nova-poshta'),
    __metadata("design:paramtypes", [nova_poshta_address_service_1.NovaPoshtaAddressService])
], NovaPoshtaController);
//# sourceMappingURL=nova-poshta.controller.js.map