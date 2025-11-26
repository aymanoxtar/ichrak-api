import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { GlobalProduct } from './entities/global-product.entity';
import { ProductCategory } from '../product-categories/entities/product-category.entity';
import { CreateGlobalProductDto } from './dto/create-global-product.dto';
import { UpdateGlobalProductDto } from './dto/update-global-product.dto';
import { SearchProductDto, SearchLanguage } from './dto/search-product.dto';

@Injectable()
export class GlobalProductsService {
  constructor(
    @InjectRepository(GlobalProduct)
    private productRepository: Repository<GlobalProduct>,
    @InjectRepository(ProductCategory)
    private categoryRepository: Repository<ProductCategory>,
  ) {}

  async create(createDto: CreateGlobalProductDto): Promise<GlobalProduct> {
    const { categoryIds, ...productData } = createDto;

    // Validate categories exist
    const categories = await this.categoryRepository.findBy({
      id: In(categoryIds),
    });

    if (categories.length !== categoryIds.length) {
      throw new NotFoundException('One or more categories not found');
    }

    const product = this.productRepository.create({
      ...productData,
      categories,
    });

    return this.productRepository.save(product);
  }

  async findAll(): Promise<GlobalProduct[]> {
    return this.productRepository.find({
      relations: ['categories', 'categories.parent'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<GlobalProduct> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['categories', 'categories.parent'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Increment view count
    product.viewCount++;
    await this.productRepository.save(product);

    return product;
  }

  async findByCategory(categoryId: string): Promise<GlobalProduct[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categories', 'category')
      .leftJoinAndSelect('category.parent', 'parent')
      .where('category.id = :categoryId', { categoryId })
      .orderBy('product.createdAt', 'DESC')
      .getMany();
  }

  async search(searchDto: SearchProductDto): Promise<GlobalProduct[]> {
    const { query, categoryId, language = SearchLanguage.BOTH } = searchDto;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categories', 'category')
      .leftJoinAndSelect('category.parent', 'parent')
      .where('product.isActive = :isActive', { isActive: true });

    // Filter by category if provided
    if (categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId });
    }

    // Search by query if provided
    if (query) {
      const searchTerm = `%${query.toLowerCase()}%`;

      if (language === SearchLanguage.FR) {
        queryBuilder.andWhere(
          "(LOWER(product.nameFr) LIKE :search OR LOWER(product.descriptionFr) LIKE :search OR LOWER(array_to_string(product.keywordsFr, ',')) LIKE :search)",
          { search: searchTerm },
        );
      } else if (language === SearchLanguage.AR) {
        queryBuilder.andWhere(
          "(LOWER(product.nameAr) LIKE :search OR LOWER(product.descriptionAr) LIKE :search OR LOWER(array_to_string(product.keywordsAr, ',')) LIKE :search)",
          { search: searchTerm },
        );
      } else {
        // Search in both languages
        queryBuilder.andWhere(
          "(LOWER(product.nameFr) LIKE :search OR LOWER(product.nameAr) LIKE :search OR LOWER(product.descriptionFr) LIKE :search OR LOWER(product.descriptionAr) LIKE :search OR LOWER(array_to_string(product.keywordsFr, ',')) LIKE :search OR LOWER(array_to_string(product.keywordsAr, ',')) LIKE :search)",
          { search: searchTerm },
        );
      }
    }

    return queryBuilder
      .orderBy('product.viewCount', 'DESC')
      .addOrderBy('product.createdAt', 'DESC')
      .getMany();
  }

  async update(
    id: string,
    updateDto: UpdateGlobalProductDto,
  ): Promise<GlobalProduct> {
    const product = await this.findOne(id);
    const { categoryIds, ...productData } = updateDto;

    // Update categories if provided
    if (categoryIds && categoryIds.length > 0) {
      const categories = await this.categoryRepository.findBy({
        id: In(categoryIds),
      });

      if (categories.length !== categoryIds.length) {
        throw new NotFoundException('One or more categories not found');
      }

      product.categories = categories;
    }

    Object.assign(product, productData);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  async toggleActive(id: string): Promise<GlobalProduct> {
    const product = await this.findOne(id);
    product.isActive = !product.isActive;
    return this.productRepository.save(product);
  }

  async getMostViewed(limit: number = 10): Promise<GlobalProduct[]> {
    return this.productRepository.find({
      relations: ['categories'],
      where: { isActive: true },
      order: { viewCount: 'DESC' },
      take: limit,
    });
  }

  async getLatest(limit: number = 10): Promise<GlobalProduct[]> {
    return this.productRepository.find({
      relations: ['categories'],
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
