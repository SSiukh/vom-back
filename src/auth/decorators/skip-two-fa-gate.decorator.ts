import { SetMetadata } from '@nestjs/common';

export const SKIP_TWO_FA_GATE_KEY = 'skipTwoFaGate';

export const SkipTwoFaGate = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_TWO_FA_GATE_KEY, true);
