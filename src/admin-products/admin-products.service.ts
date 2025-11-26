import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminProduct } from './entities/admin-product.entity';
import { GlobalProduct } from '../global-products/entities/global-product.entity';
import { User } from '../users/entities/user.entity';
import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';
import { Role } from '../common/enums';
import { PreCalculatedService } from '../pre-calculated/pre-calculated.service';

@Injectable()
export class AdminProductsService {
  constructor(
    @InjectRepository(AdminProduct)
    private adminProductRepository: Repository<AdminProduct>,
    @InjectRepository(GlobalProduct)
    private globalProductRepository: Repository<GlobalProduct>,
    @Inject(forwardRef(() => PreCalculatedService))
    private preCalculatedService: PreCalculatedService,
  ) {}

  async create(
    createDto: CreateAdminProductDto,
    admin: User,
  ): Promise<AdminProduct> {
    // Verify global product exists
    const globalProduct = await this.globalProductRepository.findOne({
      where: { id: createDto.globalProductId },
      relations: ['categories', 'categories.domain'],
    });

    if (!globalProduct) {
      throw new NotFoundException('Global product not found');
    }

    // Check if admin already has this product
    const existing = await this.adminProductRepository.findOne({
      where: {
        adminId: admin.id,
        globalProductId: createDto.globalProductId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'You already have this product in your inventory',
      );
    }

    const adminProduct = this.adminProductRepository.create({
      ...createDto,
      adminId: admin.id,
    });

    const savedProduct = await this.adminProductRepository.save(adminProduct);

    // Update pre-calculated data بـ Threshold optimization
    await this.preCalculatedService.handleAdminProductUpdate(
      savedProduct,
      admin,
      'update',
    );

    return savedProduct;
  }

  async findAll(): Promise<AdminProduct[]> {
    return this.adminProductRepository.find({
      relations: [
        'globalProduct',
        'globalProduct.categories',
        'admin',
        'admin.domain',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByAdmin(adminId: string): Promise<AdminProduct[]> {
    return this.adminProductRepository.find({
      where: { adminId },
      relations: ['globalProduct', 'globalProduct.categories'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByDomain(domainId: string): Promise<AdminProduct[]> {
    return this.adminProductRepository
      .createQueryBuilder('adminProduct')
      .leftJoinAndSelect('adminProduct.globalProduct', 'globalProduct')
      .leftJoinAndSelect('globalProduct.categories', 'categories')
      .leftJoinAndSelect('adminProduct.admin', 'admin')
      .where('admin.domainId = :domainId', { domainId })
      .andWhere('adminProduct.isAvailable = :isAvailable', {
        isAvailable: true,
      })
      .orderBy('adminProduct.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<AdminProduct> {
    const product = await this.adminProductRepository.findOne({
      where: { id },
      relations: [
        'globalProduct',
        'globalProduct.categories',
        'admin',
        'admin.domain',
      ],
    });

    if (!product) {
      throw new NotFoundException(`Admin product with ID ${id} not found`);
    }

    // Increment view count
    product.viewCount++;
    await this.adminProductRepository.save(product);

    return product;
  }

  async update(
    id: string,
    updateDto: UpdateAdminProductDto,
    user: User,
  ): Promise<AdminProduct> {
    const product = await this.findOne(id);

    // Only owner or super admin can update
    if (product.adminId !== user.id && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('You can only update your own products');
    }

    Object.assign(product, updateDto);
    const savedProduct = await this.adminProductRepository.save(product);

    // Update pre-calculated data بـ Threshold optimization
    await this.preCalculatedService.handleAdminProductUpdate(
      savedProduct,
      product.admin,
      'update',
    );

    return savedProduct;
  }

  async remove(id: string, user: User): Promise<void> {
    const product = await this.findOne(id);

    // Only owner or super admin can delete
    if (product.adminId !== user.id && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('You can only delete your own products');
    }

    // Update pre-calculated data (remove from Top 10)
    await this.preCalculatedService.handleAdminProductUpdate(
      product,
      product.admin,
      'delete',
    );

    await this.adminProductRepository.remove(product);
  }

  async toggleAvailability(id: string, user: User): Promise<AdminProduct> {
    const product = await this.findOne(id);

    // Only owner or super admin can toggle
    if (product.adminId !== user.id && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('You can only toggle your own products');
    }

    product.isAvailable = !product.isAvailable;
    const savedProduct = await this.adminProductRepository.save(product);

    // Update pre-calculated data
    await this.preCalculatedService.handleAdminProductUpdate(
      savedProduct,
      product.admin,
      product.isAvailable ? 'update' : 'unavailable',
    );

    return savedProduct;
  }

  async updateQuantity(
    id: string,
    quantity: number,
    user: User,
  ): Promise<AdminProduct> {
    const product = await this.findOne(id);

    // Only owner or super admin can update quantity
    if (product.adminId !== user.id && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('You can only update your own products');
    }

    product.quantity = quantity;
    const savedProduct = await this.adminProductRepository.save(product);

    // Update pre-calculated data
    // إلا quantity = 0 → حيد من Top 10
    await this.preCalculatedService.handleAdminProductUpdate(
      savedProduct,
      product.admin,
      quantity === 0 ? 'unavailable' : 'update',
    );

    return savedProduct;
  }

  // Get available global products that admin doesn't have yet
  async getAvailableGlobalProducts(adminId: string): Promise<GlobalProduct[]> {
    const adminProducts = await this.adminProductRepository.find({
      where: { adminId },
      select: ['globalProductId'],
    });

    const existingIds = adminProducts.map((ap) => ap.globalProductId);

    const query = this.globalProductRepository
      .createQueryBuilder('gp')
      .leftJoinAndSelect('gp.categories', 'categories')
      .where('gp.isActive = :isActive', { isActive: true });

    if (existingIds.length > 0) {
      query.andWhere('gp.id NOT IN (:...existingIds)', { existingIds });
    }

    return query.orderBy('gp.createdAt', 'DESC').getMany();
  }

  // Search admin products
  async search(query: string, domainId?: string): Promise<AdminProduct[]> {
    const queryBuilder = this.adminProductRepository
      .createQueryBuilder('adminProduct')
      .leftJoinAndSelect('adminProduct.globalProduct', 'globalProduct')
      .leftJoinAndSelect('globalProduct.categories', 'categories')
      .leftJoinAndSelect('adminProduct.admin', 'admin')
      .where('adminProduct.isAvailable = :isAvailable', { isAvailable: true });

    if (domainId) {
      queryBuilder.andWhere('admin.domainId = :domainId', { domainId });
    }

    if (query) {
      const searchTerm = `%${query.toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(globalProduct.nameFr) LIKE :search OR LOWER(globalProduct.nameAr) LIKE :search OR LOWER(adminProduct.location) LIKE :search)',
        { search: searchTerm },
      );
    }

    return queryBuilder
      .orderBy('adminProduct.viewCount', 'DESC')
      .addOrderBy('adminProduct.createdAt', 'DESC')
      .getMany();
  }
}
