import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Review } from '../reviews/entities/review.entity';
import { Service } from '../services/entities/service.entity';
import { Role } from '../common/enums';

// Type definitions for service methods
export interface ServiceNearbyResult {
  id: string;
  title: string;
  description: string;
  images: string[];
  category: {
    id: string;
    name: string;
    domain: { id: string; name: string } | null;
  } | null;
  artisanCount: number;
  nearestArtisanDistance: number;
}

interface ArtisanWithService {
  service?: {
    id: string;
    title: string;
    description: string;
    images: string[];
    category: {
      id: string;
      name: string;
      domain: { id: string; name: string } | null;
    } | null;
  };
  distanceKm?: number;
}

@Injectable()
export class ArtisansService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
  ) {}

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Format artisan data for response (without sensitive info)
   */
  private async formatArtisan(artisan: User, distanceKm?: number) {
    const reviews = await this.reviewRepository.find({
      where: { artisanId: artisan.id },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    return {
      id: artisan.id,
      firstName: artisan.firstName,
      lastName: artisan.lastName,
      phone: artisan.phone,
      city: artisan.city,
      address: artisan.address,
      profileImage: artisan.profileImage,
      businessName: artisan.businessName,
      businessDescription: artisan.businessDescription,
      businessLogo: artisan.businessLogo,
      latitude: artisan.latitude,
      longitude: artisan.longitude,
      service: artisan.service
        ? {
            id: artisan.service.id,
            title: artisan.service.title,
            description: artisan.service.description,
            images: artisan.service.images,
            category: artisan.service.category
              ? {
                  id: artisan.service.category.id,
                  name: artisan.service.category.name,
                  domain: artisan.service.category.domain
                    ? {
                        id: artisan.service.category.domain.id,
                        name: artisan.service.category.domain.name,
                      }
                    : null,
                }
              : null,
          }
        : null,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ...(distanceKm !== undefined && {
        distanceKm: Math.round(distanceKm * 10) / 10,
      }),
    };
  }

  /**
   * Find artisans near a location (sorted by distance)
   */
  async findNearby(params: {
    latitude: number;
    longitude: number;
    radiusKm: number;
    serviceId?: string;
    categoryId?: string;
  }): Promise<any[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.service', 'service')
      .leftJoinAndSelect('service.category', 'category')
      .leftJoinAndSelect('category.domain', 'domain')
      .where('user.role = :role', { role: Role.ARTISAN })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere('user.latitude IS NOT NULL')
      .andWhere('user.longitude IS NOT NULL');

    if (params.serviceId) {
      queryBuilder.andWhere('user.serviceId = :serviceId', {
        serviceId: params.serviceId,
      });
    }

    if (params.categoryId) {
      queryBuilder.andWhere('service.categoryId = :categoryId', {
        categoryId: params.categoryId,
      });
    }

    const artisans = await queryBuilder.getMany();

    // Calculate distance and filter by radius
    const artisansWithDistance = artisans
      .map((artisan) => ({
        artisan,
        distance: this.calculateDistance(
          params.latitude,
          params.longitude,
          Number(artisan.latitude),
          Number(artisan.longitude),
        ),
      }))
      .filter((item) => item.distance <= params.radiusKm)
      .sort((a, b) => a.distance - b.distance);

    // Format response
    return Promise.all(
      artisansWithDistance.map((item) =>
        this.formatArtisan(item.artisan, item.distance),
      ),
    );
  }

  /**
   * Get services available near a location
   */
  async getServicesNearby(params: {
    latitude: number;
    longitude: number;
    radiusKm: number;
    categoryId?: string;
  }): Promise<ServiceNearbyResult[]> {
    // Get all artisans nearby
    const nearbyArtisans = await this.findNearby({
      ...params,
      serviceId: undefined,
    });

    // Extract unique services
    const servicesMap = new Map<string, ServiceNearbyResult>();
    for (const artisan of nearbyArtisans as ArtisanWithService[]) {
      if (artisan.service && !servicesMap.has(artisan.service.id)) {
        servicesMap.set(artisan.service.id, {
          id: artisan.service.id,
          title: artisan.service.title,
          description: artisan.service.description,
          images: artisan.service.images,
          category: artisan.service.category,
          artisanCount: 0,
          nearestArtisanDistance: artisan.distanceKm ?? Infinity,
        });
      }
      if (artisan.service) {
        const svc = servicesMap.get(artisan.service.id);
        if (svc) {
          svc.artisanCount++;
          if (
            artisan.distanceKm !== undefined &&
            artisan.distanceKm < svc.nearestArtisanDistance
          ) {
            svc.nearestArtisanDistance = artisan.distanceKm;
          }
        }
      }
    }

    return Array.from(servicesMap.values()).sort(
      (a, b) => a.nearestArtisanDistance - b.nearestArtisanDistance,
    );
  }

  /**
   * Find artisans near the logged-in user's saved location
   */
  async findNearUserLocation(
    userId: string,
    params: {
      radiusKm: number;
      serviceId?: string;
      categoryId?: string;
    },
  ): Promise<any[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user?.latitude || !user?.longitude) {
      throw new NotFoundException(
        'Your location is not set. Please update your profile with latitude and longitude.',
      );
    }

    return this.findNearby({
      latitude: Number(user.latitude),
      longitude: Number(user.longitude),
      ...params,
    });
  }

  /**
   * Get services available near the user's saved location
   */
  async getServicesNearUserLocation(
    userId: string,
    params: {
      radiusKm: number;
      categoryId?: string;
    },
  ): Promise<any[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user?.latitude || !user?.longitude) {
      throw new NotFoundException(
        'Your location is not set. Please update your profile with latitude and longitude.',
      );
    }

    return this.getServicesNearby({
      latitude: Number(user.latitude),
      longitude: Number(user.longitude),
      ...params,
    });
  }

  /**
   * Get all active artisans with filters (city-based)
   */
  async findAll(filters: {
    serviceId?: string;
    categoryId?: string;
    city?: string;
  }): Promise<any[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.service', 'service')
      .leftJoinAndSelect('service.category', 'category')
      .leftJoinAndSelect('category.domain', 'domain')
      .where('user.role = :role', { role: Role.ARTISAN })
      .andWhere('user.isActive = :isActive', { isActive: true });

    if (filters.serviceId) {
      queryBuilder.andWhere('user.serviceId = :serviceId', {
        serviceId: filters.serviceId,
      });
    }

    if (filters.categoryId) {
      queryBuilder.andWhere('service.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters.city) {
      queryBuilder.andWhere('LOWER(user.city) = LOWER(:city)', {
        city: filters.city,
      });
    }

    const artisans = await queryBuilder.getMany();

    return Promise.all(artisans.map((artisan) => this.formatArtisan(artisan)));
  }

  /**
   * Get artisan profile by ID with reviews
   */
  async findOne(id: string): Promise<any> {
    const artisan = await this.userRepository.findOne({
      where: { id, role: Role.ARTISAN, isActive: true },
      relations: ['service', 'service.category', 'service.category.domain'],
    });

    if (!artisan) {
      throw new NotFoundException('Artisan not found');
    }

    const reviews = await this.reviewRepository.find({
      where: { artisanId: id },
      relations: ['client'],
      order: { createdAt: 'DESC' },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    return {
      id: artisan.id,
      firstName: artisan.firstName,
      lastName: artisan.lastName,
      phone: artisan.phone,
      city: artisan.city,
      address: artisan.address,
      profileImage: artisan.profileImage,
      businessName: artisan.businessName,
      businessDescription: artisan.businessDescription,
      businessLogo: artisan.businessLogo,
      latitude: artisan.latitude,
      longitude: artisan.longitude,
      service: artisan.service
        ? {
            id: artisan.service.id,
            title: artisan.service.title,
            description: artisan.service.description,
            images: artisan.service.images,
            category: artisan.service.category
              ? {
                  id: artisan.service.category.id,
                  name: artisan.service.category.name,
                  domain: artisan.service.category.domain
                    ? {
                        id: artisan.service.category.domain.id,
                        name: artisan.service.category.domain.name,
                      }
                    : null,
                }
              : null,
          }
        : null,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        client: r.client
          ? {
              id: r.client.id,
              firstName: r.client.firstName,
              lastName: r.client.lastName,
              profileImage: r.client.profileImage,
            }
          : null,
      })),
    };
  }

  /**
   * Get list of all cities where artisans are located
   */
  async getCities(): Promise<string[]> {
    const result: { city: string }[] = await this.userRepository
      .createQueryBuilder('user')
      .select('DISTINCT user.city', 'city')
      .where('user.role = :role', { role: Role.ARTISAN })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere('user.city IS NOT NULL')
      .getRawMany();

    return result.map((r) => r.city).filter((city) => city);
  }
}
