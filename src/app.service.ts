import { Injectable } from '@nestjs/common';
import { PingResponseDto } from './ping-response.dto';

@Injectable()
export class AppService {
  ping(): PingResponseDto {
    return { status: 'ok' };
  }
}
