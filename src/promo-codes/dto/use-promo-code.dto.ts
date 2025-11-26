import { IsString, IsUUID, IsNumber, IsOptional, Min } from 'class-validator';

export class UsePromoCodeDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsUUID()
  referredBy?: string; // User who referred (gave the code)
}
