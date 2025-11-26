import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsBoolean,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CreateGlobalProductDto {
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
  @IsArray()
  @IsString({ each: true })
  keywordsFr?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywordsAr?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  categoryIds: string[];
}
