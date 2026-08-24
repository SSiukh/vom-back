import { BadRequestException, Injectable } from '@nestjs/common';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const POSTOMAT_WAREHOUSE_TYPE_DESCRIPTION = 'Поштомат';

function formatNovaPoshtaDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

interface NovaPoshtaResponse<T> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
}

interface CounterpartyResult {
  Ref: string;
}

interface ContactPersonResult {
  Ref: string;
  Description: string;
  Phones: string;
}

interface RefDescriptionResult {
  Ref: string;
  Description: string;
}

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

export interface SenderAddressOption {
  ref: string;
  description: string;
  cityRef: string;
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

const WAYBILL_SEATS_AMOUNT = '1';
const WAYBILL_WEIGHT_KG = '0.5';
const WAYBILL_VOLUME_M3 = '0.0004';

@Injectable()
export class NovaPoshtaService {
  async verifySender(apiKey: string): Promise<SenderVerificationResult> {
    const [counterparty] = await this.callMethod<CounterpartyResult>(
      apiKey,
      'Counterparty',
      'getCounterparties',
      { CounterpartyProperty: 'Sender', Page: '1' },
    );

    if (!counterparty) {
      throw new BadRequestException(
        'No sender counterparty found for this API key',
      );
    }

    const [contactPerson] = await this.callMethod<ContactPersonResult>(
      apiKey,
      'Counterparty',
      'getCounterpartyContactPersons',
      { Ref: counterparty.Ref, Page: '1' },
    );

    if (!contactPerson) {
      throw new BadRequestException(
        'No contact person found for this counterparty',
      );
    }

    return {
      counterpartyRef: counterparty.Ref,
      contactPersonRef: contactPerson.Ref,
      fullName: contactPerson.Description,
      phone: contactPerson.Phones,
    };
  }

  async searchCities(apiKey: string, query: string): Promise<AddressOption[]> {
    const cities = await this.callMethod<RefDescriptionResult>(
      apiKey,
      'Address',
      'getCities',
      { FindByString: query, Limit: '20' },
    );

    return cities.map((city) => ({
      ref: city.Ref,
      description: city.Description,
    }));
  }

  async getWarehouseTypes(apiKey: string): Promise<AddressOption[]> {
    const types = await this.callMethod<RefDescriptionResult>(
      apiKey,
      'Address',
      'getWarehouseTypes',
      {},
    );

    return types.map((type) => ({
      ref: type.Ref,
      description: type.Description,
    }));
  }

  async getWarehouses(
    apiKey: string,
    cityRef: string,
    typeOfWarehouseRef?: string,
  ): Promise<AddressOption[]> {
    const warehouses = await this.callMethod<RefDescriptionResult>(
      apiKey,
      'Address',
      'getWarehouses',
      {
        CityRef: cityRef,
        ...(typeOfWarehouseRef && { TypeOfWarehouseRef: typeOfWarehouseRef }),
      },
    );

    return warehouses.map((warehouse) => ({
      ref: warehouse.Ref,
      description: warehouse.Description,
    }));
  }

  async getStreets(
    apiKey: string,
    cityRef: string,
    query?: string,
  ): Promise<AddressOption[]> {
    const streets = await this.callMethod<RefDescriptionResult>(
      apiKey,
      'Address',
      'getStreet',
      { CityRef: cityRef, ...(query && { FindByString: query }) },
    );

    return streets.map((street) => ({
      ref: street.Ref,
      description: street.Description,
    }));
  }

  async getPostomats(
    apiKey: string,
    cityRef: string,
  ): Promise<AddressOption[]> {
    const types = await this.getWarehouseTypes(apiKey);
    const postomatType = types.find(
      (type) => type.description === POSTOMAT_WAREHOUSE_TYPE_DESCRIPTION,
    );

    if (!postomatType) {
      throw new BadRequestException(
        'Could not resolve the Nova Poshta postomat warehouse type',
      );
    }

    return this.getWarehouses(apiKey, cityRef, postomatType.ref);
  }

  async getSenderAddresses(
    apiKey: string,
    counterpartyRef: string,
  ): Promise<SenderAddressOption[]> {
    const addresses = await this.callMethod<
      RefDescriptionResult & { CityRef: string }
    >(apiKey, 'Counterparty', 'getCounterpartyAddresses', {
      Ref: counterpartyRef,
      CounterpartyProperty: 'Sender',
    });

    return addresses.map((address) => ({
      ref: address.Ref,
      description: address.Description,
      cityRef: address.CityRef,
    }));
  }

  async createWaybill(
    apiKey: string,
    params: CreateWaybillParams,
  ): Promise<WaybillResult> {
    const [result] = await this.callMethod<{
      Ref: string;
      IntDocNumber: string;
    }>(apiKey, 'InternetDocument', 'save', {
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
      throw new BadRequestException('Nova Poshta did not return a waybill');
    }

    return { waybillNumber: result.IntDocNumber, waybillRef: result.Ref };
  }

  async updateWaybill(
    apiKey: string,
    params: UpdateWaybillParams,
  ): Promise<void> {
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

  async deleteWaybill(apiKey: string, waybillRef: string): Promise<void> {
    await this.callMethod(apiKey, 'InternetDocument', 'delete', {
      DocumentRefs: [waybillRef],
    });
  }

  async getShipmentStatus(
    apiKey: string,
    waybillNumber: string,
  ): Promise<ShipmentStatus> {
    const [result] = await this.callMethod<{
      StatusCode: string;
      Status: string;
    }>(apiKey, 'TrackingDocument', 'getStatusDocuments', {
      Documents: [{ DocumentNumber: waybillNumber }],
    });

    if (!result) {
      throw new BadRequestException(
        'No tracking info found for this waybill number',
      );
    }

    return { statusCode: result.StatusCode, status: result.Status };
  }

  private buildBackwardDeliveryData(codAmount: number | null): {
    BackwardDeliveryData?: {
      PayerType: string;
      CargoType: string;
      RedeliveryString: string;
    }[];
  } {
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

  private async callMethod<T>(
    apiKey: string,
    modelName: string,
    calledMethod: string,
    methodProperties: Record<string, unknown>,
  ): Promise<T[]> {
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
      throw new BadRequestException('Nova Poshta API request failed');
    }

    const result = (await response.json()) as NovaPoshtaResponse<T>;
    if (!result.success) {
      throw new BadRequestException(
        result.errors[0] ?? 'Nova Poshta API returned an error',
      );
    }

    return result.data;
  }
}
