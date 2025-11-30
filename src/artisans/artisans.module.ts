import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtisansService } from './artisans.service';
import { ArtisansController } from './artisans.controller';
import { User } from '../users/entities/user.entity';
import { Review } from '../reviews/entities/review.entity';
import { Service } from '../services/entities/service.entity';
import { Category } from '../categories/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Review, Service, Category])],
  controllers: [ArtisansController],
  providers: [ArtisansService],
  exports: [ArtisansService],
})
export class ArtisansModule {}
