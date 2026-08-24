import { NovaPoshtaAddressService } from './nova-poshta-address.service';
import { AddressOptionDto } from './dto/address-option.dto';
import { SearchCitiesQueryDto } from './dto/search-cities-query.dto';
import { CityRefQueryDto } from './dto/city-ref-query.dto';
import { SearchStreetsQueryDto } from './dto/search-streets-query.dto';
export declare class NovaPoshtaController {
    private readonly addressService;
    constructor(addressService: NovaPoshtaAddressService);
    searchCities(query: SearchCitiesQueryDto): Promise<AddressOptionDto[]>;
    getWarehouses(query: CityRefQueryDto): Promise<AddressOptionDto[]>;
    getStreets(query: SearchStreetsQueryDto): Promise<AddressOptionDto[]>;
    getPostomats(query: CityRefQueryDto): Promise<AddressOptionDto[]>;
}
