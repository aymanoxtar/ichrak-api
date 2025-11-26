import { IsEnum, IsString, IsOptional, IsUUID } from 'class-validator';
import { CategoryType } from '../../common/enums';

export class CreateCategoryDto {
  @IsEnum(CategoryType)
  type: CategoryType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsUUID()
  domainId: string;
}
