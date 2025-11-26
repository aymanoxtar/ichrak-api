import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async create(createLocationDto: CreateLocationDto): Promise<Location> {
    const location = this.locationRepository.create(createLocationDto);
    return this.locationRepository.save(location);
  }

  async findAll(): Promise<Location[]> {
    return this.locationRepository.find({
      where: { isActive: true },
      order: { city: 'ASC', order: 'ASC' },
    });
  }

  async findByCity(city: string): Promise<Location[]> {
    return this.locationRepository.find({
      where: { city, isActive: true },
      order: { order: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Location> {
    const location = await this.locationRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
    return location;
  }

  async findNearest(latitude: number, longitude: number): Promise<Location> {
    // حساب أقرب نقطة للمستخدم
    const locations = await this.locationRepository.find({
      where: { isActive: true },
    });

    if (locations.length === 0) {
      throw new NotFoundException('No locations found');
    }

    let nearest = locations[0];
    let minDistance = this.calculateDistance(
      latitude,
      longitude,
      Number(nearest.latitude),
      Number(nearest.longitude),
    );

    for (const location of locations) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        Number(location.latitude),
        Number(location.longitude),
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = location;
      }
    }

    return nearest;
  }

  // حساب المسافة بين نقطتين (Haversine formula)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // نصف قطر الأرض بالمتر
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // المسافة بالمتر
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async update(
    id: string,
    updateLocationDto: UpdateLocationDto,
  ): Promise<Location> {
    const location = await this.findOne(id);
    Object.assign(location, updateLocationDto);
    return this.locationRepository.save(location);
  }

  async remove(id: string): Promise<void> {
    const location = await this.findOne(id);
    await this.locationRepository.remove(location);
  }

  async toggleActive(id: string): Promise<Location> {
    const location = await this.findOne(id);
    location.isActive = !location.isActive;
    return this.locationRepository.save(location);
  }
}
