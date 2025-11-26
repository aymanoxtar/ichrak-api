import {
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateAdminProductDto {
  @IsUUID()
  globalProductId: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  commission: number;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  locationDetails?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  livraisonMemeVille?: number; // تكلفة التوصيل داخل نفس المدينة

  @IsOptional()
  @IsNumber()
  @Min(0)
  livraisonGeneral?: number; // تكلفة التوصيل لمدن أخرى
}
