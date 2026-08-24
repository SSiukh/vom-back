import { AppService } from './app.service';
import { PingResponseDto } from './ping-response.dto';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    ping(): PingResponseDto;
}
