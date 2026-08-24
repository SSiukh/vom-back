import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SendersService } from './senders.service';
import { VerifySenderDto } from './dto/verify-sender.dto';
import { CreateSenderDto } from './dto/create-sender.dto';
import { SenderVerificationResultDto } from './dto/sender-verification-result.dto';
import { SenderResponseDto } from './dto/sender-response.dto';
import { ListSendersQueryDto } from './dto/list-senders-query.dto';
import { ListSendersResponseDto } from './dto/list-senders-response.dto';
import { SenderAddressResponseDto } from './dto/sender-address-response.dto';
import { ParseObjectIdPipe } from '../shared/pipes/parse-object-id.pipe';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const NOVA_POSHTA_CALL_THROTTLE_TTL_MS = 60_000;
const NOVA_POSHTA_CALL_THROTTLE_LIMIT = 5;

@ApiTags('senders')
@Controller('senders')
export class SendersController {
  constructor(private readonly sendersService: SendersService) {}

  @Get()
  findAll(
    @Query() query: ListSendersQueryDto,
  ): Promise<ListSendersResponseDto> {
    return this.sendersService.findAll(
      query.page ?? DEFAULT_PAGE,
      query.pageSize ?? DEFAULT_PAGE_SIZE,
    );
  }

  @Throttle({
    default: {
      limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
      ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
    },
  })
  @Post('verify')
  verify(@Body() dto: VerifySenderDto): Promise<SenderVerificationResultDto> {
    return this.sendersService.verify(dto);
  }

  @Throttle({
    default: {
      limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
      ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
    },
  })
  @Post()
  create(@Body() dto: CreateSenderDto): Promise<SenderResponseDto> {
    return this.sendersService.create(dto);
  }

  @Patch(':id/activate')
  activate(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<SenderResponseDto> {
    return this.sendersService.activate(id);
  }

  @Throttle({
    default: {
      limit: NOVA_POSHTA_CALL_THROTTLE_LIMIT,
      ttl: NOVA_POSHTA_CALL_THROTTLE_TTL_MS,
    },
  })
  @Patch(':id/refresh')
  refresh(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<SenderResponseDto> {
    return this.sendersService.refresh(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.sendersService.deactivate(id);
  }

  @Get(':id/addresses')
  findAddresses(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<SenderAddressResponseDto[]> {
    return this.sendersService.findAddresses(id);
  }
}
