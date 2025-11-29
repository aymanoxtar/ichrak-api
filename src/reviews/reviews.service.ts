import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { User } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Role } from '../common/enums';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(
    createReviewDto: CreateReviewDto,
    client: User,
  ): Promise<Review> {
    // Verify artisan exists and is actually an artisan
    const artisan = await this.userRepository.findOne({
      where: { id: createReviewDto.artisanId, role: Role.ARTISAN },
    });

    if (!artisan) {
      throw new BadRequestException('Artisan not found');
    }

    // Check if client already reviewed this artisan
    const existingReview = await this.reviewRepository.findOne({
      where: { clientId: client.id, artisanId: createReviewDto.artisanId },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this artisan');
    }

    const review = this.reviewRepository.create({
      ...createReviewDto,
      clientId: client.id,
    });

    return this.reviewRepository.save(review);
  }

  async findAll(): Promise<Review[]> {
    return this.reviewRepository.find({
      relations: ['client', 'artisan'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByArtisan(artisanId: string): Promise<{
    reviews: Review[];
    averageRating: number;
    totalReviews: number;
  }> {
    const reviews = await this.reviewRepository.find({
      where: { artisanId },
      relations: ['client'],
      order: { createdAt: 'DESC' },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    return {
      reviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
    };
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['client', 'artisan'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    user: User,
  ): Promise<Review> {
    const review = await this.findOne(id);

    // Only the client who wrote the review can update it
    if (review.clientId !== user.id && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    Object.assign(review, updateReviewDto);
    return this.reviewRepository.save(review);
  }

  async remove(id: string, user: User): Promise<void> {
    const review = await this.findOne(id);

    // Only the client who wrote the review or super admin can delete it
    if (review.clientId !== user.id && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewRepository.remove(review);
  }
}
