import { buildOrderSearchFilter } from './order-search';

describe('buildOrderSearchFilter', () => {
  it('returns an empty filter for a missing or blank search', () => {
    expect(buildOrderSearchFilter()).toEqual({});
    expect(buildOrderSearchFilter('   ')).toEqual({});
  });

  it('matches a single token against the waybill number and every name part', () => {
    expect(buildOrderSearchFilter('Іван')).toEqual({
      AND: [
        {
          OR: [
            { npWaybillNumber: { contains: 'Іван', mode: 'insensitive' } },
            {
              recipient: {
                is: { lastName: { contains: 'Іван', mode: 'insensitive' } },
              },
            },
            {
              recipient: {
                is: { firstName: { contains: 'Іван', mode: 'insensitive' } },
              },
            },
            {
              recipient: {
                is: { middleName: { contains: 'Іван', mode: 'insensitive' } },
              },
            },
          ],
        },
      ],
    });
  });

  it('ANDs every whitespace-separated token so a full name can span fields', () => {
    const filter = buildOrderSearchFilter('  Іваненко   Іван ');

    expect(filter.AND).toHaveLength(2);
  });

  it('escapes regex metacharacters so they match literally', () => {
    const filter = buildOrderSearchFilter('.*');

    expect(filter.AND![0].OR[0]).toEqual({
      npWaybillNumber: { contains: '\\.\\*', mode: 'insensitive' },
    });
  });
});
