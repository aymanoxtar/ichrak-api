import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';

export enum SearchLanguage {
  FR = 'fr',
  AR = 'ar',
  BOTH = 'both',
}

export class SearchProductDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(SearchLanguage)
  language?: SearchLanguage;
}
