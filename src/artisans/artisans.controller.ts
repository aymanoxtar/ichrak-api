import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ArtisansService } from './artisans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

// Public + Client endpoints for browsing artisans
// Client Flow: Location → Services → Artisans (nearby)
@ApiTags('Artisans')
@Controller('artisans')
export class ArtisansController {
  constructor(private readonly artisansService: ArtisansService) {}

  // ============================================
  // Location-based endpoints (Main feature)
  // ============================================

  @Get('nearby')
  @ApiOperation({
    summary: 'Get artisans near a location (Public)',
    description:
      'Returns artisans sorted by distance from given coordinates. Pass lat/lng to find nearby artisans.',
  })
  @ApiQuery({
    name: 'lat',
    required: true,
    description: 'Latitude of client location',
    example: 33.5731,
  })
  @ApiQuery({
    name: 'lng',
    required: true,
    description: 'Longitude of client location',
    example: -7.5898,
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: 'Search radius in kilometers (default: 50km)',
    example: 50,
  })
  @ApiQuery({
    name: 'serviceId',
    required: false,
    description: 'Filter by service ID',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of nearby artisans sorted by distance',
  })
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
    @Query('serviceId') serviceId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.artisansService.findNearby({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      radiusKm: radius ? parseFloat(radius) : 50,
      serviceId,
      categoryId,
    });
  }

  @Get('nearby/services')
  @ApiOperation({
    summary: 'Get services available near a location (Public)',
    description:
      'Returns services that have at least one artisan near the given coordinates.',
  })
  @ApiQuery({
    name: 'lat',
    required: true,
    description: 'Latitude of client location',
  })
  @ApiQuery({
    name: 'lng',
    required: true,
    description: 'Longitude of client location',
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: 'Search radius in kilometers (default: 50km)',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of services available nearby',
  })
  getServicesNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.artisansService.getServicesNearby({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      radiusKm: radius ? parseFloat(radius) : 50,
      categoryId,
    });
  }

  // ============================================
  // Client authenticated endpoint - uses saved location
  // ============================================

  @Get('my-location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get artisans near MY saved location (Client)',
    description:
      'Returns artisans near your saved profile location. Update your location in profile first.',
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: 'Search radius in kilometers (default: 50km)',
  })
  @ApiQuery({
    name: 'serviceId',
    required: false,
    description: 'Filter by service ID',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of artisans near your location',
  })
  findNearMyLocation(
    @CurrentUser() user: User,
    @Query('radius') radius?: string,
    @Query('serviceId') serviceId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.artisansService.findNearUserLocation(user.id, {
      radiusKm: radius ? parseFloat(radius) : 50,
      serviceId,
      categoryId,
    });
  }

  @Get('my-location/services')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get services available near MY location (Client)',
    description: 'Returns services with artisans near your saved location.',
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: 'Search radius in kilometers (default: 50km)',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of services available near your location',
  })
  getServicesNearMyLocation(
    @CurrentUser() user: User,
    @Query('radius') radius?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.artisansService.getServicesNearUserLocation(user.id, {
      radiusKm: radius ? parseFloat(radius) : 50,
      categoryId,
    });
  }

  // ============================================
  // Public endpoints (city-based fallback)
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Get all artisans with filters (Public)',
    description:
      'Browse artisans filtered by service, category, or city. Use /nearby for location-based search.',
  })
  @ApiQuery({
    name: 'serviceId',
    required: false,
    description: 'Filter by service ID',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    description: 'Filter by city name',
  })
  @ApiResponse({
    status: 200,
    description: 'List of artisans with average ratings',
  })
  findAll(
    @Query('serviceId') serviceId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('city') city?: string,
  ) {
    return this.artisansService.findAll({ serviceId, categoryId, city });
  }

  @Get('cities')
  @ApiOperation({
    summary: 'Get list of cities where artisans are available (Public)',
  })
  @ApiResponse({ status: 200, description: 'List of city names' })
  getCities() {
    return this.artisansService.getCities();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get artisan profile with reviews (Public)',
    description:
      'Get detailed artisan profile including all reviews. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Artisan profile with reviews and average rating',
  })
  @ApiResponse({ status: 404, description: 'Artisan not found' })
  findOne(@Param('id') id: string) {
    return this.artisansService.findOne(id);
  }
}
