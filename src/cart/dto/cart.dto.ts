import { IsNumber, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsUUID()
  adminProductId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class UpdateCartItemDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class RemoveFromCartDto {
  @IsUUID()
  adminProductId: string;
}
