import { escapeRegExp } from './escape-regexp';

export function buildOrderSearchFilter(search?: string) {
  const tokens = (search ?? '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return {};
  }

  return {
    AND: tokens.map((token) => {
      const contains = {
        contains: escapeRegExp(token),
        mode: 'insensitive' as const,
      };

      return {
        OR: [
          { npWaybillNumber: contains },
          { recipient: { is: { lastName: contains } } },
          { recipient: { is: { firstName: contains } } },
          { recipient: { is: { middleName: contains } } },
        ],
      };
    }),
  };
}
