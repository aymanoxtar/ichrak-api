import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  name: string; // مثال: "Casa - Maarif"

  @IsString()
  city: string; // مثال: "Casablanca"

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;
}
