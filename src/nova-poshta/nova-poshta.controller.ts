import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { NovaPoshtaAddressService } from './nova-poshta-address.service';
import { AddressOptionDto } from './dto/address-option.dto';
import { SearchCitiesQueryDto } from './dto/search-cities-query.dto';
import { CityRefQueryDto } from './dto/city-ref-query.dto';
import { SearchStreetsQueryDto } from './dto/search-streets-query.dto';

const ADDRESS_LOOKUP_THROTTLE_TTL_MS = 60_000;
const ADDRESS_LOOKUP_THROTTLE_LIMIT = 30;

@ApiTags('nova-poshta')
@Throttle({
  default: {
    limit: ADDRESS_LOOKUP_THROTTLE_LIMIT,
    ttl: ADDRESS_LOOKUP_THROTTLE_TTL_MS,
  },
})
@Controller('nova-poshta')
export class NovaPoshtaController {
  constructor(private readonly addressService: NovaPoshtaAddressService) {}

  @Get('cities')
  searchCities(
    @Query() query: SearchCitiesQueryDto,
  ): Promise<AddressOptionDto[]> {
    return this.addressService.searchCities(query.query);
  }

  @Get('warehouses')
  getWarehouses(@Query() query: CityRefQueryDto): Promise<AddressOptionDto[]> {
    return this.addressService.getWarehouses(query.cityRef);
  }

  @Get('streets')
  getStreets(
    @Query() query: SearchStreetsQueryDto,
  ): Promise<AddressOptionDto[]> {
    return this.addressService.getStreets(query.cityRef, query.query);
  }

  @Get('postomats')
  getPostomats(@Query() query: CityRefQueryDto): Promise<AddressOptionDto[]> {
    return this.addressService.getPostomats(query.cityRef);
  }
}
