import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID()
  adminProductId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsUUID()
  adminId: string; // Admin اللي عندو المنتجات

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  // Delivery Info
  @IsString()
  deliveryAddress: string;

  @IsString()
  deliveryCity: string;

  @IsOptional()
  @IsString()
  deliveryPhone?: string;

  // Client Location
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientLongitude?: number;

  // Notes
  @IsOptional()
  @IsString()
  clientNotes?: string;

  // Promo Code (optional)
  @IsOptional()
  @IsUUID()
  promoCodeId?: string;
}
