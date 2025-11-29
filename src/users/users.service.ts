import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Service } from '../services/entities/service.entity';
import { Domain } from '../domains/entities/domain.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Domain)
    private domainRepository: Repository<Domain>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Validate serviceId if role is ARTISAN
    if (createUserDto.role === Role.ARTISAN) {
      if (!createUserDto.serviceId) {
        throw new BadRequestException('Service is required for Artisan role');
      }

      const service = await this.serviceRepository.findOne({
        where: { id: createUserDto.serviceId, isActive: true },
      });

      if (!service) {
        throw new BadRequestException('Invalid or inactive service');
      }

      if (!createUserDto.phone) {
        throw new BadRequestException('Phone is required for Artisan role');
      }

      if (!createUserDto.city) {
        throw new BadRequestException('City is required for Artisan role');
      }
    }

    // Validate domainId if role is ADMIN
    if (createUserDto.role === Role.ADMIN) {
      if (!createUserDto.domainId) {
        throw new BadRequestException('Domain is required for Admin role');
      }

      const domain = await this.domainRepository.findOne({
        where: { id: createUserDto.domainId },
      });

      if (!domain) {
        throw new BadRequestException('Invalid domain');
      }
    }

    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        role: true,
        isActive: true,
        businessName: true,
        businessDescription: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['service', 'service.category', 'domain'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByRole(role: Role): Promise<User[]> {
    return this.userRepository.find({
      where: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        role: true,
        isActive: true,
        businessName: true,
        businessDescription: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async toggleActive(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = !user.isActive;
    return this.userRepository.save(user);
  }

  // OAuth methods
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { googleId } });
  }

  async findByFacebookId(facebookId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { facebookId } });
  }

  /**
   * Reset password by Super Admin
   * كيولد password جديد عشوائي
   */
  async resetPassword(id: string): Promise<{ newPassword: string }> {
    const user = await this.findOne(id);

    // Generate random password (8 characters)
    const newPassword = Math.random().toString(36).slice(-8);

    // Hash and save
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { newPassword };
  }

  /**
   * Reset password with custom password by Super Admin
   */
  async resetPasswordCustom(
    id: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.findOne(id);

    // Hash and save
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Password reset successfully' };
  }
}
