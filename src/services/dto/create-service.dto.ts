import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({ example: 'Réparation Plomberie', description: 'Service title' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Réparation complète de plomberie à domicile', description: 'Service description' })
  @IsString()
  description: string;

  @ApiProperty({ example: 150, description: 'Service price in MAD' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 60, description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ example: ['image1.jpg', 'image2.jpg'], description: 'Service images' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ example: true, description: 'Service availability' })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ example: 'uuid-of-category', description: 'Category ID (Plombier, Electricien, etc.)' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ example: 'uuid-of-artisan', description: 'Artisan ID (Super Admin only)' })
  @IsOptional()
  @IsUUID()
  artisanId?: string;
}
