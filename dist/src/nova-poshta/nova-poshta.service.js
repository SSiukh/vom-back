"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NovaPoshtaService = void 0;
const common_1 = require("@nestjs/common");
const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const POSTOMAT_WAREHOUSE_TYPE_DESCRIPTION = 'Поштомат';
function formatNovaPoshtaDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}
const WAYBILL_SEATS_AMOUNT = '1';
const WAYBILL_WEIGHT_KG = '0.5';
const WAYBILL_VOLUME_M3 = '0.0004';
let NovaPoshtaService = class NovaPoshtaService {
    async verifySender(apiKey) {
        const [counterparty] = await this.callMethod(apiKey, 'Counterparty', 'getCounterparties', { CounterpartyProperty: 'Sender', Page: '1' });
        if (!counterparty) {
            throw new common_1.BadRequestException('No sender counterparty found for this API key');
        }
        const [contactPerson] = await this.callMethod(apiKey, 'Counterparty', 'getCounterpartyContactPersons', { Ref: counterparty.Ref, Page: '1' });
        if (!contactPerson) {
            throw new common_1.BadRequestException('No contact person found for this counterparty');
        }
        return {
            counterpartyRef: counterparty.Ref,
            contactPersonRef: contactPerson.Ref,
            fullName: contactPerson.Description,
            phone: contactPerson.Phones,
        };
    }
    async searchCities(apiKey, query) {
        const cities = await this.callMethod(apiKey, 'Address', 'getCities', { FindByString: query, Limit: '20' });
        return cities.map((city) => ({
            ref: city.Ref,
            description: city.Description,
        }));
    }
    async getWarehouseTypes(apiKey) {
        const types = await this.callMethod(apiKey, 'Address', 'getWarehouseTypes', {});
        return types.map((type) => ({
            ref: type.Ref,
            description: type.Description,
        }));
    }
    async getWarehouses(apiKey, cityRef, typeOfWarehouseRef) {
        const warehouses = await this.callMethod(apiKey, 'Address', 'getWarehouses', {
            CityRef: cityRef,
            ...(typeOfWarehouseRef && { TypeOfWarehouseRef: typeOfWarehouseRef }),
        });
        return warehouses.map((warehouse) => ({
            ref: warehouse.Ref,
            description: warehouse.Description,
        }));
    }
    async getStreets(apiKey, cityRef, query) {
        const streets = await this.callMethod(apiKey, 'Address', 'getStreet', { CityRef: cityRef, ...(query && { FindByString: query }) });
        return streets.map((street) => ({
            ref: street.Ref,
            description: street.Description,
        }));
    }
    async getPostomats(apiKey, cityRef) {
        const types = await this.getWarehouseTypes(apiKey);
        const postomatType = types.find((type) => type.description === POSTOMAT_WAREHOUSE_TYPE_DESCRIPTION);
        if (!postomatType) {
            throw new common_1.BadRequestException('Could not resolve the Nova Poshta postomat warehouse type');
        }
        return this.getWarehouses(apiKey, cityRef, postomatType.ref);
    }
    async getSenderAddresses(apiKey, counterpartyRef) {
        const addresses = await this.callMethod(apiKey, 'Counterparty', 'getCounterpartyAddresses', {
            Ref: counterpartyRef,
            CounterpartyProperty: 'Sender',
        });
        return addresses.map((address) => ({
            ref: address.Ref,
            description: address.Description,
            cityRef: address.CityRef,
        }));
    }
    async createWaybill(apiKey, params) {
        const [result] = await this.callMethod(apiKey, 'InternetDocument', 'save', {
            DateTime: formatNovaPoshtaDate(new Date()),
            PayerType: 'Recipient',
            PaymentMethod: 'Cash',
            CargoType: params.cargoType,
            ServiceType: params.serviceType,
            SeatsAmount: WAYBILL_SEATS_AMOUNT,
            Weight: WAYBILL_WEIGHT_KG,
            VolumeGeneral: WAYBILL_VOLUME_M3,
            Cost: String(params.cost),
            Description: params.description,
            Sender: params.senderCounterpartyRef,
            ContactSender: params.senderContactPersonRef,
            SendersPhone: params.senderPhone,
            CitySender: params.senderCityRef,
            SenderAddress: params.senderAddressRef,
            NewAddress: '1',
            CityRecipient: params.recipientCityRef,
            RecipientAddress: params.recipientAddressRef,
            RecipientName: params.recipientName,
            RecipientsPhone: params.recipientPhone,
            ...this.buildBackwardDeliveryData(params.codAmount),
        });
        if (!result) {
            throw new common_1.BadRequestException('Nova Poshta did not return a waybill');
        }
        return { waybillNumber: result.IntDocNumber, waybillRef: result.Ref };
    }
    async updateWaybill(apiKey, params) {
        await this.callMethod(apiKey, 'InternetDocument', 'update', {
            Ref: params.waybillRef,
            PayerType: 'Recipient',
            PaymentMethod: 'Cash',
            CargoType: params.cargoType,
            ServiceType: params.serviceType,
            SeatsAmount: WAYBILL_SEATS_AMOUNT,
            Weight: WAYBILL_WEIGHT_KG,
            VolumeGeneral: WAYBILL_VOLUME_M3,
            Cost: String(params.cost),
            Description: params.description,
            Sender: params.senderCounterpartyRef,
            ContactSender: params.senderContactPersonRef,
            SendersPhone: params.senderPhone,
            CitySender: params.senderCityRef,
            SenderAddress: params.senderAddressRef,
            CityRecipient: params.recipientCityRef,
            RecipientAddress: params.recipientAddressRef,
            RecipientsPhone: params.recipientPhone,
            ...this.buildBackwardDeliveryData(params.codAmount),
        });
    }
    async deleteWaybill(apiKey, waybillRef) {
        await this.callMethod(apiKey, 'InternetDocument', 'delete', {
            DocumentRefs: [waybillRef],
        });
    }
    async getShipmentStatus(apiKey, waybillNumber) {
        const [result] = await this.callMethod(apiKey, 'TrackingDocument', 'getStatusDocuments', {
            Documents: [{ DocumentNumber: waybillNumber }],
        });
        if (!result) {
            throw new common_1.BadRequestException('No tracking info found for this waybill number');
        }
        return { statusCode: result.StatusCode, status: result.Status };
    }
    buildBackwardDeliveryData(codAmount) {
        if (codAmount === null) {
            return {};
        }
        return {
            BackwardDeliveryData: [
                {
                    PayerType: 'Recipient',
                    CargoType: 'Money',
                    RedeliveryString: String(codAmount),
                },
            ],
        };
    }
    async callMethod(apiKey, modelName, calledMethod, methodProperties) {
        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey,
                modelName,
                calledMethod,
                methodProperties,
            }),
        });
        if (!response.ok) {
            throw new common_1.BadRequestException('Nova Poshta API request failed');
        }
        const result = (await response.json());
        if (!result.success) {
            throw new common_1.BadRequestException(result.errors[0] ?? 'Nova Poshta API returned an error');
        }
        return result.data;
    }
};
exports.NovaPoshtaService = NovaPoshtaService;
exports.NovaPoshtaService = NovaPoshtaService = __decorate([
    (0, common_1.Injectable)()
], NovaPoshtaService);
//# sourceMappingURL=nova-poshta.service.js.map