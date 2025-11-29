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

// Service = Template created by Super Admin (no price, no artisan)
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
    // Only Super Admin can create service templates
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can create service templates');
    }

    const service = this.serviceRepository.create(createServiceDto);
    return this.serviceRepository.save(service);
  }

  async findAll(): Promise<Service[]> {
    return this.serviceRepository.find({
      relations: ['category', 'category.domain'],
      where: { isActive: true },
    });
  }

  async findByCategory(categoryId: string): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { categoryId, isActive: true },
      relations: ['category', 'category.domain'],
    });
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: ['category', 'category.domain'],
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
    // Only Super Admin can update service templates
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can update service templates');
    }

    const service = await this.findOne(id);
    Object.assign(service, updateServiceDto);
    return this.serviceRepository.save(service);
  }

  async remove(id: string, user: User): Promise<void> {
    // Only Super Admin can delete service templates
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can delete service templates');
    }

    const service = await this.findOne(id);
    await this.serviceRepository.remove(service);
  }

  async toggleActive(id: string, user: User): Promise<Service> {
    // Only Super Admin can toggle
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can toggle service templates');
    }

    const service = await this.findOne(id);
    service.isActive = !service.isActive;
    return this.serviceRepository.save(service);
  }
}
