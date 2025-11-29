import { IsUUID, IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 5, description: 'Rating from 1 to 5 stars' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    example: 'Excellent service!',
    description: 'Review comment',
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({
    example: 'uuid-of-artisan',
    description: 'Artisan ID being reviewed',
  })
  @IsUUID()
  artisanId: string;
}
