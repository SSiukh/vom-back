const KYIV_TIME_ZONE = 'Europe/Kiev';
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const kyivPartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: KYIV_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function kyivOffsetMs(instant: Date): number {
  const parts = kyivPartsFormatter.formatToParts(instant);
  const part = (type: string): number =>
    Number(parts.find((candidate) => candidate.type === type)!.value);
  const wallClockAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );

  return wallClockAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

function kyivStartOfDay(year: number, month: number, day: number): Date {
  const utcMidnight = Date.UTC(year, month - 1, day);
  const firstGuess = utcMidnight - kyivOffsetMs(new Date(utcMidnight));
  const secondGuess = utcMidnight - kyivOffsetMs(new Date(firstGuess));

  return new Date(secondGuess);
}

export function parseRangeStart(value: string): Date {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    return new Date(value);
  }

  return kyivStartOfDay(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function parseRangeEnd(value: string): Date {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    return new Date(value);
  }
  const nextDayStart = kyivStartOfDay(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]) + 1,
  );

  return new Date(nextDayStart.getTime() - 1);
}

export function kyivDayKey(instant: Date): string {
  const parts = kyivPartsFormatter.formatToParts(instant);
  const part = (type: string): string =>
    parts.find((candidate) => candidate.type === type)!.value;

  return `${part('year')}-${part('month')}-${part('day')}`;
}
