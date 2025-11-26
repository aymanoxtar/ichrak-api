import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { AdminProduct } from '../admin-products/entities/admin-product.entity';
import { User } from '../users/entities/user.entity';
import { LocationsService } from '../locations/locations.service';
import { Role } from '../common/enums';

@Injectable()
export class ProductCategoriesService {
  constructor(
    @InjectRepository(ProductCategory)
    private categoryRepository: Repository<ProductCategory>,
    @InjectRepository(AdminProduct)
    private adminProductRepository: Repository<AdminProduct>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private locationsService: LocationsService,
  ) {}

  async create(createDto: CreateProductCategoryDto): Promise<ProductCategory> {
    // Validate parent exists if parentId is provided
    if (createDto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: createDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID ${createDto.parentId} not found`,
        );
      }
    }

    const category = this.categoryRepository.create(createDto);
    return this.categoryRepository.save(category);
  }

  async findAll(): Promise<ProductCategory[]> {
    return this.categoryRepository.find({
      relations: ['parent', 'children'],
      order: { order: 'ASC', nameFr: 'ASC' },
    });
  }

  async findRootCategories(): Promise<ProductCategory[]> {
    // Get only top-level categories (no parent)
    return this.categoryRepository.find({
      where: { parentId: IsNull() },
      relations: ['children'],
      order: { order: 'ASC', nameFr: 'ASC' },
    });
  }

  async findTree(): Promise<ProductCategory[]> {
    // Build complete tree structure
    const rootCategories = await this.categoryRepository.find({
      where: { parentId: IsNull() },
      relations: ['children'],
      order: { order: 'ASC', nameFr: 'ASC' },
    });

    // Recursively load all children
    for (const root of rootCategories) {
      await this.loadChildren(root);
    }

    return rootCategories;
  }

  private async loadChildren(category: ProductCategory): Promise<void> {
    const children = await this.categoryRepository.find({
      where: { parentId: category.id },
      relations: ['children'],
      order: { order: 'ASC', nameFr: 'ASC' },
    });

    category.children = children;

    for (const child of children) {
      await this.loadChildren(child);
    }
  }

  async findOne(id: string): Promise<ProductCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findByParent(parentId: string): Promise<ProductCategory[]> {
    return this.categoryRepository.find({
      where: { parentId },
      relations: ['children'],
      order: { order: 'ASC', nameFr: 'ASC' },
    });
  }

  async update(
    id: string,
    updateDto: UpdateProductCategoryDto,
  ): Promise<ProductCategory> {
    const category = await this.findOne(id);

    // Prevent circular reference
    if (updateDto.parentId) {
      if (updateDto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      // Check if the new parent is a descendant of this category
      const isDescendant = await this.isDescendant(id, updateDto.parentId);
      if (isDescendant) {
        throw new BadRequestException(
          'Cannot set a descendant as parent (circular reference)',
        );
      }

      // Validate parent exists
      const parent = await this.categoryRepository.findOne({
        where: { id: updateDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID ${updateDto.parentId} not found`,
        );
      }
    }

    Object.assign(category, updateDto);
    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    // Check if has children
    if (category.children && category.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with subcategories',
      );
    }

    await this.categoryRepository.remove(category);
  }

  async toggleActive(id: string): Promise<ProductCategory> {
    const category = await this.findOne(id);
    category.isActive = !category.isActive;
    return this.categoryRepository.save(category);
  }

  private async isDescendant(
    ancestorId: string,
    descendantId: string,
  ): Promise<boolean> {
    const descendant = await this.categoryRepository.findOne({
      where: { id: descendantId },
      relations: ['parent'],
    });

    if (!descendant || !descendant.parentId) {
      return false;
    }

    if (descendant.parentId === ancestorId) {
      return true;
    }

    return this.isDescendant(ancestorId, descendant.parentId);
  }

  async getPath(id: string): Promise<ProductCategory[]> {
    const category = await this.findOne(id);
    const path: ProductCategory[] = [category];

    let current = category;
    while (current.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: current.parentId },
      });
      if (parent) {
        path.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }

    return path;
  }

  // =========================================================================
  // NEW METHODS FOR COMMON CATEGORIES
  // =========================================================================

  /**
   * Get list of admins who have products in a common category
   * Sorted by distance (nearest first)
   * Used for: Client clicks on common category (PPR, Robinet, etc.)
   */
  async getAdminsByCategory(
    categoryId: string,
    clientLatitude: number,
    clientLongitude: number,
    domainId?: string,
  ) {
    // 1. Verify category exists and is common
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    if (!category.isCommon) {
      throw new BadRequestException(
        'This category is not marked as common. Use regular product search instead.',
      );
    }

    // 2. Find all AdminProducts in this category with stock > 0
    const queryBuilder = this.adminProductRepository
      .createQueryBuilder('ap')
      .leftJoinAndSelect('ap.admin', 'admin')
      .leftJoinAndSelect('ap.globalProduct', 'gp')
      .leftJoinAndSelect('gp.categories', 'cat')
      .where('cat.id = :categoryId', { categoryId })
      .andWhere('ap.quantity > 0')
      .andWhere('ap.isAvailable = true')
      .andWhere('gp.isActive = true')
      .andWhere('admin.role = :role', { role: Role.ADMIN })
      .andWhere('admin.isActive = true');

    // Filter by domain if provided
    if (domainId) {
      queryBuilder.andWhere('admin.domainId = :domainId', { domainId });
    }

    const adminProducts = await queryBuilder.getMany();

    // 3. Group by admin and calculate distance
    const adminMap = new Map<
      string,
      {
        adminId: string;
        businessName: string;
        businessLogo: string;
        phone: string;
        city: string;
        distance: number;
        livraisonMemeVille: number;
        productsCount: number;
      }
    >();

    for (const ap of adminProducts) {
      const admin = ap.admin;
      if (!adminMap.has(admin.id)) {
        const distance = this.locationsService.calculateDistance(
          clientLatitude,
          clientLongitude,
          Number(admin.latitude) || 0,
          Number(admin.longitude) || 0,
        );

        adminMap.set(admin.id, {
          adminId: admin.id,
          businessName: admin.businessName || '',
          businessLogo: admin.businessLogo || '',
          phone: admin.phone || '',
          city: admin.city || '',
          distance: Math.round(distance),
          livraisonMemeVille: Number(ap.livraisonMemeVille) || 0,
          productsCount: 1,
        });
      } else {
        // Increment products count for this admin
        const existing = adminMap.get(admin.id)!;
        existing.productsCount += 1;
      }
    }

    // 4. Convert to array and sort by distance
    const admins = Array.from(adminMap.values()).sort(
      (a, b) => a.distance - b.distance,
    );

    return {
      categoryId,
      categoryNameFr: category.nameFr,
      categoryNameAr: category.nameAr,
      totalAdmins: admins.length,
      admins,
    };
  }

  /**
   * Get all products for a specific admin in a specific category
   * Used for: Client clicks on admin to see their products
   */
  async getProductsByAdminAndCategory(adminId: string, categoryId: string) {
    // 1. Verify admin exists
    const admin = await this.userRepository.findOne({
      where: { id: adminId, role: Role.ADMIN },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${adminId} not found`);
    }

    // 2. Verify category exists
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // 3. Find all products for this admin in this category
    const adminProducts = await this.adminProductRepository
      .createQueryBuilder('ap')
      .leftJoinAndSelect('ap.globalProduct', 'gp')
      .leftJoinAndSelect('gp.categories', 'cat')
      .where('cat.id = :categoryId', { categoryId })
      .andWhere('ap.adminId = :adminId', { adminId })
      .andWhere('ap.isAvailable = true')
      .andWhere('gp.isActive = true')
      .getMany();

    // 4. Format response
    const products = adminProducts.map((ap) => ({
      adminProductId: ap.id,
      globalProductId: ap.globalProductId,
      nameFr: ap.globalProduct.nameFr,
      nameAr: ap.globalProduct.nameAr,
      descriptionFr: ap.globalProduct.descriptionFr,
      descriptionAr: ap.globalProduct.descriptionAr,
      images: ap.globalProduct.images,
      price: Number(ap.price),
      quantity: ap.quantity,
      location: ap.location,
      locationDetails: ap.locationDetails,
    }));

    return {
      adminId: admin.id,
      businessName: admin.businessName || '',
      businessLogo: admin.businessLogo || '',
      phone: admin.phone || '',
      city: admin.city || '',
      categoryId,
      categoryNameFr: category.nameFr,
      categoryNameAr: category.nameAr,
      totalProducts: products.length,
      products,
    };
  }
}
