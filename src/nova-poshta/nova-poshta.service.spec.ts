import { BadRequestException } from '@nestjs/common';
import { NovaPoshtaService } from './nova-poshta.service';

describe('NovaPoshtaService', () => {
  let service: NovaPoshtaService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new NovaPoshtaService();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('resolves counterparty and contact person info for a valid API key', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [{ Ref: 'counterparty-ref' }],
            errors: [],
            warnings: [],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                Ref: 'contact-person-ref',
                Description: 'Іваненко Іван Іванович',
                Phones: '380501234567',
              },
            ],
            errors: [],
            warnings: [],
          }),
      });

    const result = await service.verifySender('test-api-key');

    expect(result).toEqual({
      counterpartyRef: 'counterparty-ref',
      contactPersonRef: 'contact-person-ref',
      fullName: 'Іваненко Іван Іванович',
      phone: '380501234567',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when no counterparty is found for the API key', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: [], errors: [], warnings: [] }),
    });

    await expect(service.verifySender('bad-key')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when Nova Poshta returns an error', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: false,
          data: [],
          errors: ['Invalid API key'],
          warnings: [],
        }),
    });

    await expect(service.verifySender('bad-key')).rejects.toThrow(
      'Invalid API key',
    );
  });

  it('throws when the HTTP request itself fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });

    await expect(service.verifySender('any-key')).rejects.toThrow(
      BadRequestException,
    );
  });

  function mockNovaPoshtaResponse(data: unknown[]) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data, errors: [], warnings: [] }),
    });
  }

  describe('searchCities', () => {
    it('maps Ref/Description to ref/description', async () => {
      mockNovaPoshtaResponse([{ Ref: 'city-ref', Description: 'Київ' }]);

      const result = await service.searchCities('test-api-key', 'Київ');

      expect(result).toEqual([{ ref: 'city-ref', description: 'Київ' }]);
    });
  });

  describe('getWarehouses', () => {
    it('passes only CityRef when no type filter is given', async () => {
      mockNovaPoshtaResponse([
        { Ref: 'warehouse-ref', Description: 'Відділення №1' },
      ]);

      const result = await service.getWarehouses('test-api-key', 'city-ref');

      const parsedBody = JSON.parse(
        (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
      ) as { methodProperties: Record<string, unknown> };
      expect(parsedBody.methodProperties).toEqual({ CityRef: 'city-ref' });
      expect(result).toEqual([
        { ref: 'warehouse-ref', description: 'Відділення №1' },
      ]);
    });

    it('includes TypeOfWarehouseRef when a type filter is given', async () => {
      mockNovaPoshtaResponse([]);

      await service.getWarehouses('test-api-key', 'city-ref', 'type-ref');

      const parsedBody = JSON.parse(
        (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
      ) as { methodProperties: Record<string, unknown> };
      expect(parsedBody.methodProperties).toEqual({
        CityRef: 'city-ref',
        TypeOfWarehouseRef: 'type-ref',
      });
    });
  });

  describe('getStreets', () => {
    it('maps Ref/Description to ref/description', async () => {
      mockNovaPoshtaResponse([{ Ref: 'street-ref', Description: 'Хрещатик' }]);

      const result = await service.getStreets('test-api-key', 'city-ref');

      expect(result).toEqual([{ ref: 'street-ref', description: 'Хрещатик' }]);
    });
  });

  describe('getPostomats', () => {
    it('resolves the postomat warehouse type then filters warehouses by it', async () => {
      mockNovaPoshtaResponse([
        { Ref: 'branch-type-ref', Description: 'Поштове(ий)' },
        { Ref: 'postomat-type-ref', Description: 'Поштомат' },
      ]);
      mockNovaPoshtaResponse([
        { Ref: 'postomat-ref', Description: 'Поштомат №1' },
      ]);

      const result = await service.getPostomats('test-api-key', 'city-ref');

      expect(result).toEqual([
        { ref: 'postomat-ref', description: 'Поштомат №1' },
      ]);
      const parsedBody = JSON.parse(
        (fetchMock.mock.calls[1] as [string, { body: string }])[1].body,
      ) as { methodProperties: Record<string, unknown> };
      expect(parsedBody.methodProperties).toEqual({
        CityRef: 'city-ref',
        TypeOfWarehouseRef: 'postomat-type-ref',
      });
    });

    it('throws if the postomat warehouse type cannot be resolved', async () => {
      mockNovaPoshtaResponse([
        { Ref: 'branch-type-ref', Description: 'Поштове(ий)' },
      ]);

      await expect(
        service.getPostomats('test-api-key', 'city-ref'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSenderAddresses', () => {
    it('maps Ref/Description/CityRef to ref/description/cityRef', async () => {
      mockNovaPoshtaResponse([
        {
          Ref: 'address-ref',
          Description: 'Луцьк, вул. Молоді, 8а',
          CityRef: 'lutsk-city-ref',
        },
      ]);

      const result = await service.getSenderAddresses(
        'test-api-key',
        'counterparty-ref',
      );

      expect(result).toEqual([
        {
          ref: 'address-ref',
          description: 'Луцьк, вул. Молоді, 8а',
          cityRef: 'lutsk-city-ref',
        },
      ]);
      const parsedBody = JSON.parse(
        (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
      ) as {
        modelName: string;
        calledMethod: string;
        methodProperties: Record<string, unknown>;
      };
      expect(parsedBody.modelName).toBe('Counterparty');
      expect(parsedBody.calledMethod).toBe('getCounterpartyAddresses');
      expect(parsedBody.methodProperties).toEqual({
        Ref: 'counterparty-ref',
        CounterpartyProperty: 'Sender',
      });
    });
  });

  describe('createWaybill', () => {
    const params = {
      senderCounterpartyRef: 'sender-counterparty-ref',
      senderContactPersonRef: 'sender-contact-ref',
      senderPhone: '380950000000',
      senderCityRef: 'sender-city-ref',
      senderAddressRef: 'sender-address-ref',
      cargoType: 'Parcel',
      serviceType: 'DoorsWarehouse',
      cost: 200,
      codAmount: 200,
      description: 'Test order',
      recipientCityRef: 'recipient-city-ref',
      recipientAddressRef: 'recipient-warehouse-ref',
      recipientName: 'Тест Тестовий',
      recipientPhone: '380501234567',
    };

    it('returns the waybill number and ref from the response', async () => {
      mockNovaPoshtaResponse([
        { Ref: 'waybill-ref', IntDocNumber: '20450000000000' },
      ]);

      const result = await service.createWaybill('test-api-key', params);

      expect(result).toEqual({
        waybillNumber: '20450000000000',
        waybillRef: 'waybill-ref',
      });
    });

    it('sends PayerType Recipient / PaymentMethod Cash and the fixed weight/volume/seats defaults', async () => {
      mockNovaPoshtaResponse([
        { Ref: 'waybill-ref', IntDocNumber: '20450000000000' },
      ]);

      await service.createWaybill('test-api-key', params);

      const parsedBody = JSON.parse(
        (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
      ) as { methodProperties: Record<string, unknown> };
      expect(parsedBody.methodProperties).toMatchObject({
        PayerType: 'Recipient',
        PaymentMethod: 'Cash',
        SeatsAmount: '1',
        Weight: '0.5',
        VolumeGeneral: '0.0004',
        NewAddress: '1',
        Sender: params.senderCounterpartyRef,
        ContactSender: params.senderContactPersonRef,
        SendersPhone: params.senderPhone,
        CitySender: params.senderCityRef,
        SenderAddress: params.senderAddressRef,
        CityRecipient: params.recipientCityRef,
        RecipientAddress: params.recipientAddressRef,
        RecipientName: params.recipientName,
        RecipientsPhone: params.recipientPhone,
      });
    });

    it('sends the codAmount as a cash-on-delivery BackwardDeliveryData entry', async () => {
      mockNovaPoshtaResponse([
        { Ref: 'waybill-ref', IntDocNumber: '20450000000000' },
      ]);

      await service.createWaybill('test-api-key', params);

      const parsedBody = JSON.parse(
        (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
      ) as { methodProperties: Record<string, unknown> };
      expect(parsedBody.methodProperties.BackwardDeliveryData).toEqual([
        { PayerType: 'Recipient', CargoType: 'Money', RedeliveryString: '200' },
      ]);
    });

    it('omits BackwardDeliveryData entirely when codAmount is null (fully prepaid order)', async () => {
      mockNovaPoshtaResponse([
        { Ref: 'waybill-ref', IntDocNumber: '20450000000000' },
      ]);

      await service.createWaybill('test-api-key', {
        ...params,
        codAmount: null,
      });

      const parsedBody = JSON.parse(
        (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
      ) as { methodProperties: Record<string, unknown> };
      expect(parsedBody.methodProperties.BackwardDeliveryData).toBeUndefined();
    });

    it('throws when Nova Poshta returns no waybill', async () => {
      mockNovaPoshtaResponse([]);

      await expect(
        service.createWaybill('test-api-key', params),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateWaybill', () => {
    const updateParams = {
      waybillRef: 'waybill-ref',
      senderCounterpartyRef: 'sender-counterparty-ref',
      senderContactPersonRef: 'sender-contact-ref',
      senderPhone: '380950000000',
      senderCityRef: 'sender-city-ref',
      senderAddressRef: 'sender-address-ref',
      cargoType: 'Parcel',
      serviceType: 'DoorsWarehouse',
      cost: 250,
      codAmount: 250,
      description: 'Updated order',
      recipientCityRef: 'recipient-city-ref',
      recipientAddressRef: 'recipient-warehouse-ref',
      recipientPhone: '380501234567',
    };

    it('sends the Ref and the safe editable subset of fields, without any recipient counterparty ref', async () => {
      mockNovaPoshtaResponse([{ Ref: 'waybill-ref' }]);

      await service.updateWaybill('test-api-key', updateParams);

      const parsedBody = JSON.parse(
        (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
      ) as {
        modelName: string;
        calledMethod: string;
        methodProperties: Record<string, unknown>;
      };
      expect(parsedBody.modelName).toBe('InternetDocument');
      expect(parsedBody.calledMethod).toBe('update');
      expect(parsedBody.methodProperties).toEqual({
        Ref: 'waybill-ref',
        PayerType: 'Recipient',
        PaymentMethod: 'Cash',
        CargoType: 'Parcel',
        ServiceType: 'DoorsWarehouse',
        SeatsAmount: '1',
        Weight: '0.5',
        VolumeGeneral: '0.0004',
        Cost: '250',
        Description: 'Updated order',
        Sender: updateParams.senderCounterpartyRef,
        ContactSender: updateParams.senderContactPersonRef,
        SendersPhone: updateParams.senderPhone,
        CitySender: updateParams.senderCityRef,
        SenderAddress: updateParams.senderAddressRef,
        CityRecipient: updateParams.recipientCityRef,
        RecipientAddress: updateParams.recipientAddressRef,
        RecipientsPhone: updateParams.recipientPhone,
        BackwardDeliveryData: [
          {
            PayerType: 'Recipient',
            CargoType: 'Money',
            RedeliveryString: '250',
          },
        ],
      });
    });

    it('omits BackwardDeliveryData entirely when codAmount is null (fully prepaid order)', async () => {
      mockNovaPoshtaResponse([{ Ref: 'waybill-ref' }]);

      await service.updateWaybill('test-api-key', {
        ...updateParams,
        codAmount: null,
      });

      const parsedBody = JSON.parse(
        (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
      ) as { methodProperties: Record<string, unknown> };
      expect(parsedBody.methodProperties.BackwardDeliveryData).toBeUndefined();
    });
  });

  describe('deleteWaybill', () => {
    it('sends DocumentRefs as an array containing the waybill ref', async () => {
      mockNovaPoshtaResponse([{ Ref: 'waybill-ref' }]);

      await service.deleteWaybill('test-api-key', 'waybill-ref');

      const parsedBody = JSON.parse(
        (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
      ) as {
        modelName: string;
        calledMethod: string;
        methodProperties: Record<string, unknown>;
      };
      expect(parsedBody.modelName).toBe('InternetDocument');
      expect(parsedBody.calledMethod).toBe('delete');
      expect(parsedBody.methodProperties).toEqual({
        DocumentRefs: ['waybill-ref'],
      });
    });
  });

  describe('getShipmentStatus', () => {
    it('returns the status and status code for the waybill number', async () => {
      mockNovaPoshtaResponse([{ StatusCode: '9', Status: 'Отримано' }]);

      const result = await service.getShipmentStatus(
        'test-api-key',
        '20450000000000',
      );

      expect(result).toEqual({ statusCode: '9', status: 'Отримано' });
    });

    it('throws when no tracking info is returned', async () => {
      mockNovaPoshtaResponse([]);

      await expect(
        service.getShipmentStatus('test-api-key', '20450000000000'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
