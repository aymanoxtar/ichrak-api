import { IsEnum, IsString, IsOptional } from 'class-validator';
import { DomainType } from '../../common/enums';

export class CreateDomainDto {
  @IsEnum(DomainType)
  type: DomainType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
