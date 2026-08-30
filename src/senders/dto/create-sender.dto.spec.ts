import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSenderDto } from './create-sender.dto';

async function validateDto(plain: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreateSenderDto, plain);
  const errors = await validate(dto);

  return errors.map((error) => error.property);
}

describe('CreateSenderDto', () => {
  it('is valid when cityRef/warehouseRef are both present', async () => {
    const errors = await validateDto({
      apiKey: 'raw-key',
      cityRef: 'city-ref',
      warehouseRef: 'warehouse-ref',
    });

    expect(errors).toEqual([]);
  });

  it('is valid when cityRef/warehouseRef are both absent', async () => {
    const errors = await validateDto({ apiKey: 'raw-key' });

    expect(errors).toEqual([]);
  });

  it('is invalid when only cityRef is present', async () => {
    const errors = await validateDto({
      apiKey: 'raw-key',
      cityRef: 'city-ref',
    });

    expect(errors).toContain('warehouseRef');
  });

  it('is invalid when only warehouseRef is present', async () => {
    const errors = await validateDto({
      apiKey: 'raw-key',
      warehouseRef: 'warehouse-ref',
    });

    expect(errors).toContain('cityRef');
  });
});
