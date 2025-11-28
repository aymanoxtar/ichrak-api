import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
  ) {}

  async create(
    createServiceDto: CreateServiceDto,
    user: User,
  ): Promise<Service> {
    // Super Admin can specify artisanId, otherwise use current user's ID
    const artisanId =
      user.role === Role.SUPER_ADMIN && createServiceDto.artisanId
        ? createServiceDto.artisanId
        : user.id;

    const service = this.serviceRepository.create({
      ...createServiceDto,
      artisanId,
    });
    return this.serviceRepository.save(service);
  }

  async findAll(): Promise<Service[]> {
    return this.serviceRepository.find({
      relations: ['artisan', 'category', 'category.domain'],
    });
  }

  async findByArtisan(artisanId: string): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { artisanId },
      relations: ['category', 'category.domain'],
    });
  }

  async findByCategory(categoryId: string): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { categoryId },
      relations: ['artisan', 'category', 'category.domain'],
    });
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: ['artisan', 'category', 'category.domain'],
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async update(
    id: string,
    updateServiceDto: UpdateServiceDto,
    user: User,
  ): Promise<Service> {
    const service = await this.findOne(id);

    // Only artisan owner or super admin can update
    if (service.artisanId !== user.id && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('You can only update your own services');
    }

    Object.assign(service, updateServiceDto);
    return this.serviceRepository.save(service);
  }

  async remove(id: string, user: User): Promise<void> {
    const service = await this.findOne(id);

    // Only artisan owner or super admin can delete
    if (service.artisanId !== user.id && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('You can only delete your own services');
    }

    await this.serviceRepository.remove(service);
  }

  async toggleAvailability(id: string, user: User): Promise<Service> {
    const service = await this.findOne(id);

    // Only artisan owner or super admin can toggle
    if (service.artisanId !== user.id && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('You can only toggle your own services');
    }

    service.isAvailable = !service.isAvailable;
    return this.serviceRepository.save(service);
  }
}
