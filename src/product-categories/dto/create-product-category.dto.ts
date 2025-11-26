import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateProductCategoryDto {
  @IsString()
  nameFr: string;

  @IsString()
  nameAr: string;

  @IsOptional()
  @IsString()
  descriptionFr?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isCommon?: boolean;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
