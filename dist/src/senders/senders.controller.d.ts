import { SendersService } from './senders.service';
import { VerifySenderDto } from './dto/verify-sender.dto';
import { CreateSenderDto } from './dto/create-sender.dto';
import { SenderVerificationResultDto } from './dto/sender-verification-result.dto';
import { SenderResponseDto } from './dto/sender-response.dto';
import { ListSendersQueryDto } from './dto/list-senders-query.dto';
import { ListSendersResponseDto } from './dto/list-senders-response.dto';
import { SenderAddressResponseDto } from './dto/sender-address-response.dto';
export declare class SendersController {
    private readonly sendersService;
    constructor(sendersService: SendersService);
    findAll(query: ListSendersQueryDto): Promise<ListSendersResponseDto>;
    verify(dto: VerifySenderDto): Promise<SenderVerificationResultDto>;
    create(dto: CreateSenderDto): Promise<SenderResponseDto>;
    activate(id: string): Promise<SenderResponseDto>;
    refresh(id: string): Promise<SenderResponseDto>;
    deactivate(id: string): Promise<void>;
    findAddresses(id: string): Promise<SenderAddressResponseDto[]>;
}
