import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Service = Template created by Super Admin (no price, no artisan)
export class CreateServiceDto {
  @ApiProperty({ example: 'Réparation Plomberie', description: 'Service title' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Réparation complète de plomberie à domicile', description: 'Service description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: ['image1.jpg', 'image2.jpg'], description: 'Service images' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ example: true, description: 'Service is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 'uuid-of-category', description: 'Category ID (Plombier, Electricien, etc.)' })
  @IsUUID()
  categoryId: string;
}
