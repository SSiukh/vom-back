import { BadRequestException } from '@nestjs/common';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

describe('ParseObjectIdPipe', () => {
  const pipe = new ParseObjectIdPipe();

  it('passes through a valid 24-char hex ObjectId', () => {
    expect(pipe.transform('507f1f77bcf86cd799439011')).toBe(
      '507f1f77bcf86cd799439011',
    );
  });

  it('rejects a malformed id', () => {
    expect(() => pipe.transform('not-an-object-id')).toThrow(
      BadRequestException,
    );
  });

  it('rejects an id of the wrong length', () => {
    expect(() => pipe.transform('507f1f77bcf86cd79943901')).toThrow(
      BadRequestException,
    );
  });
});
