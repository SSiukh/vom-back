export interface SenderVerificationResult {
    counterpartyRef: string;
    contactPersonRef: string;
    fullName: string;
    phone: string;
}
export interface AddressOption {
    ref: string;
    description: string;
}
export interface CreateWaybillParams {
    senderCounterpartyRef: string;
    senderContactPersonRef: string;
    senderPhone: string;
    senderCityRef: string;
    senderAddressRef: string;
    cargoType: string;
    serviceType: string;
    cost: number;
    codAmount: number | null;
    description: string;
    recipientCityRef: string;
    recipientAddressRef: string;
    recipientName: string;
    recipientPhone: string;
}
export interface WaybillResult {
    waybillNumber: string;
    waybillRef: string;
}
export interface UpdateWaybillParams {
    waybillRef: string;
    senderCounterpartyRef: string;
    senderContactPersonRef: string;
    senderPhone: string;
    senderCityRef: string;
    senderAddressRef: string;
    cargoType: string;
    serviceType: string;
    cost: number;
    codAmount: number | null;
    description: string;
    recipientCityRef: string;
    recipientAddressRef: string;
    recipientPhone: string;
}
export interface ShipmentStatus {
    statusCode: string;
    status: string;
}
export declare class NovaPoshtaService {
    verifySender(apiKey: string): Promise<SenderVerificationResult>;
    searchCities(apiKey: string, query: string): Promise<AddressOption[]>;
    getWarehouseTypes(apiKey: string): Promise<AddressOption[]>;
    getWarehouses(apiKey: string, cityRef: string, typeOfWarehouseRef?: string): Promise<AddressOption[]>;
    getStreets(apiKey: string, cityRef: string, query?: string): Promise<AddressOption[]>;
    getPostomats(apiKey: string, cityRef: string): Promise<AddressOption[]>;
    createWaybill(apiKey: string, params: CreateWaybillParams): Promise<WaybillResult>;
    updateWaybill(apiKey: string, params: UpdateWaybillParams): Promise<void>;
    deleteWaybill(apiKey: string, waybillRef: string): Promise<void>;
    getShipmentStatus(apiKey: string, waybillNumber: string): Promise<ShipmentStatus>;
    private buildDimensions;
    private buildBackwardDeliveryData;
    private callMethod;
}
