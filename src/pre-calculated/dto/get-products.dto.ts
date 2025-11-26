import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// DTOs للـ Mobile App
// ============================================

export class GetProductsForAppDto {
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsUUID()
  domainId: string;

  @IsOptional()
  @IsUUID()
  promoCodeAdminId?: string; // Admin اللي عندو Code Promo ديال هاد Client

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
}

export class GetProductOffersDto {
  @IsUUID()
  globalProductId: string;

  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsUUID()
  domainId: string;

  @IsString()
  clientCity: string; // مدينة Client باش نعرفو واش نفس المدينة

  @IsOptional()
  @IsUUID()
  promoCodeAdminId?: string; // Admin اللي Client مرتبط بيه
}

// ============================================
// DTOs للـ Sync (LiteSQL)
// ============================================

export class SyncDataDto {
  @IsUUID()
  locationId: string;

  @IsUUID()
  domainId: string;

  @IsOptional()
  @IsDateString()
  lastSync?: string; // ISO date string
}

// ============================================
// DTOs للـ Promo Code
// ============================================

export class GetPromoAdminProductsDto {
  @IsUUID()
  adminId: string; // Admin اللي عطا Code Promo

  @IsUUID()
  locationId: string;

  @IsUUID()
  domainId: string;
}
