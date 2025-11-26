import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PreCalculatedProduct } from './entities/pre-calculated-product.entity';
import { PreCalculatedAdmins } from './entities/pre-calculated-admins.entity';
import { PreCalculatedCommonProducts } from './entities/pre-calculated-common-products.entity';
import { PointThreshold } from './entities/point-threshold.entity';
import { ProductCategory } from '../product-categories/entities/product-category.entity';
import { Location } from '../locations/entities/location.entity';
import { GlobalProduct } from '../global-products/entities/global-product.entity';
import { AdminProduct } from '../admin-products/entities/admin-product.entity';
import { User } from '../users/entities/user.entity';
import { Domain } from '../domains/entities/domain.entity';
import { LocationsService } from '../locations/locations.service';
import { GetProductOffersDto } from './dto/get-products.dto';
import { Role } from '../common/enums';

@Injectable()
export class PreCalculatedService {
  constructor(
    @InjectRepository(PreCalculatedProduct)
    private preCalculatedRepository: Repository<PreCalculatedProduct>,
    @InjectRepository(PreCalculatedAdmins)
    private preCalculatedAdminsRepository: Repository<PreCalculatedAdmins>,
    @InjectRepository(PreCalculatedCommonProducts)
    private preCalculatedCommonRepository: Repository<PreCalculatedCommonProducts>,
    @InjectRepository(PointThreshold)
    private pointThresholdRepository: Repository<PointThreshold>,
    @InjectRepository(ProductCategory)
    private productCategoryRepository: Repository<ProductCategory>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(GlobalProduct)
    private globalProductRepository: Repository<GlobalProduct>,
    @InjectRepository(AdminProduct)
    private adminProductRepository: Repository<AdminProduct>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Domain)
    private domainRepository: Repository<Domain>,
    private locationsService: LocationsService,
  ) {}

  // ============================================
  // حساب Score - المنطق الجديد
  // ============================================

  // المسافة الحدية: 2.5 km
  private readonly DISTANCE_THRESHOLD = 2500; // بالمتر

  /**
   * حساب Score للمسافة القريبة (< 2.5 km)
   * Score = Price فقط
   */
  calculateScoreNearby(price: number): number {
    return price;
  }

  /**
   * حساب Score للمسافة البعيدة (>= 2.5 km) - نفس المدينة
   * Score = Price + livraisonMemeVille
   */
  calculateScoreSameCity(price: number, livraisonMemeVille: number): number {
    return price + livraisonMemeVille;
  }

  /**
   * حساب Score للمسافة البعيدة (>= 2.5 km) - مدينة أخرى
   * Score = Price + livraisonGeneral
   */
  calculateScoreOtherCity(price: number, livraisonGeneral: number): number {
    return price + livraisonGeneral;
  }

  /**
   * تحديد هل Admin فـ نفس مدينة Client
   */
  isSameCity(adminCity: string, clientCity: string): boolean {
    return adminCity?.toLowerCase().trim() === clientCity?.toLowerCase().trim();
  }

  // ============================================
  // جلب العروض للـ App
  // ============================================

  /**
   * جلب 3 عروض لمنتج معين
   * المنطق الجديد:
   * 1. أولاً: Admin قريب (< 2.5 km) بأقل Price
   * 2. ثانياً + ثالثاً: الباقي (>= 2.5 km) بأقل Score (Price + Frais)
   */
  async getProductOffers(dto: GetProductOffersDto) {
    const {
      globalProductId,
      latitude,
      longitude,
      domainId,
      clientCity,
      promoCodeAdminId,
    } = dto;

    // 1. جيب جميع Admin Products لهاد المنتج
    const adminProducts = await this.adminProductRepository.find({
      where: {
        globalProductId,
        isAvailable: true,
      },
      relations: ['admin'],
    });

    // فلتر الأدمن ديال هاد الـ Domain
    const domainAdmins = adminProducts.filter(
      (ap) => ap.admin && ap.admin.domainId === domainId,
    );

    if (domainAdmins.length === 0) {
      return {
        globalProductId,
        offers: [],
        message: 'No offers available for this product',
      };
    }

    // 2. حسب المسافة لكل Admin
    const allOffers = domainAdmins.map((ap) => {
      const distance = this.locationsService.calculateDistance(
        latitude,
        longitude,
        Number(ap.admin.latitude) || 0,
        Number(ap.admin.longitude) || 0,
      );

      const adminCity = ap.admin.city || '';
      const sameCity = this.isSameCity(adminCity, clientCity);

      // حساب Score حسب المسافة
      let score: number;
      let fraisLivraison: number = 0;

      if (distance < this.DISTANCE_THRESHOLD) {
        // قريب < 2.5 km → Score = Price فقط
        score = this.calculateScoreNearby(Number(ap.price));
        fraisLivraison = 0;
      } else if (sameCity) {
        // بعيد + نفس المدينة → Score = Price + livraisonMemeVille
        fraisLivraison = Number(ap.livraisonMemeVille) || 0;
        score = this.calculateScoreSameCity(Number(ap.price), fraisLivraison);
      } else {
        // بعيد + مدينة أخرى → Score = Price + livraisonGeneral
        fraisLivraison = Number(ap.livraisonGeneral) || 0;
        score = this.calculateScoreOtherCity(Number(ap.price), fraisLivraison);
      }

      return {
        adminId: ap.admin.id,
        adminProductId: ap.id,
        price: Number(ap.price),
        distance: Math.round(distance),
        score,
        fraisLivraison,
        isNearby: distance < this.DISTANCE_THRESHOLD,
        businessName: ap.admin.businessName || '',
        phone: ap.admin.phone || '',
        city: ap.admin.city || '',
        location: ap.location || '',
        quantity: ap.quantity,
      };
    });

    // 3. فصل العروض: قريب vs بعيد
    const nearbyOffers = allOffers
      .filter((o) => o.isNearby)
      .sort((a, b) => a.score - b.score); // أقل Price

    const farOffers = allOffers
      .filter((o) => !o.isNearby)
      .sort((a, b) => a.score - b.score); // أقل Score

    // 4. بناء الـ 3 عروض
    let finalOffers: ((typeof allOffers)[0] & { isPromoAdmin?: boolean })[] =
      [];

    // إلا Client مرتبط بـ Admin (Code Promo)
    if (promoCodeAdminId) {
      const promoAdminOffer = allOffers.find(
        (o) => o.adminId === promoCodeAdminId,
      );

      if (promoAdminOffer) {
        // Admin ديالو موجود → حطو الأول دائماً
        finalOffers.push({ ...promoAdminOffer, isPromoAdmin: true });

        // كمل بالباقي (غير اللي Score ديالهم أكبر من Admin ديالو)
        const otherOffers = allOffers
          .filter(
            (o) =>
              o.adminId !== promoCodeAdminId && o.score > promoAdminOffer.score,
          )
          .sort((a, b) => a.score - b.score)
          .slice(0, 2);

        finalOffers.push(...otherOffers);

        return { globalProductId, offers: finalOffers };
      }
    }

    // 5. بلا Code Promo: أولاً القريب، ثم البعيد
    if (nearbyOffers.length > 0) {
      // عندنا على الأقل Admin قريب
      finalOffers.push(nearbyOffers[0]); // أرخص قريب

      // كمل بالبعيدين
      const remaining = farOffers.slice(0, 2);
      finalOffers.push(...remaining);
    } else {
      // ما كاين حتى Admin قريب، خد أحسن 3 من البعيدين
      finalOffers = farOffers.slice(0, 3);
    }

    return {
      globalProductId,
      offers: finalOffers,
    };
  }

  // ============================================
  // جلب جميع المنتجات للـ App (الصفحة الرئيسية)
  // ============================================

  async getAllProductsForApp(
    latitude: number,
    longitude: number,
    domainId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // جيب جميع Global Products
    const skip = (page - 1) * limit;

    const [products, total] = await this.globalProductRepository.findAndCount({
      where: { isActive: true },
      relations: ['categories'],
      order: { viewCount: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: products.map((p) => ({
        id: p.id,
        nameFr: p.nameFr,
        nameAr: p.nameAr,
        images: p.images,
        categories: p.categories,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // Pre-calculate لمنتج واحد
  // ============================================

  async calculateForProduct(
    locationId: string,
    globalProductId: string,
    domainId: string,
    refLatitude: number,
    refLongitude: number,
    refCity: string = '', // مدينة Location المرجعية
  ): Promise<PreCalculatedProduct> {
    // جيب جميع Admin Products لهاد المنتج
    const adminProducts = await this.adminProductRepository.find({
      where: {
        globalProductId,
        isAvailable: true,
      },
      relations: ['admin'],
    });

    // فلتر الأدمن ديال هاد الـ Domain
    const domainAdmins = adminProducts.filter(
      (ap) => ap.admin && ap.admin.domainId === domainId,
    );

    // حسب المسافة والـ Score لكل واحد بالمنطق الجديد
    const offers = domainAdmins
      .map((ap) => {
        const distance = this.locationsService.calculateDistance(
          refLatitude,
          refLongitude,
          Number(ap.admin.latitude) || 0,
          Number(ap.admin.longitude) || 0,
        );

        const adminCity = ap.admin.city || '';
        const sameCity = this.isSameCity(adminCity, refCity);

        // حساب Score حسب المسافة
        let score: number;
        let fraisLivraison: number = 0;

        if (distance < this.DISTANCE_THRESHOLD) {
          // قريب < 2.5 km → Score = Price فقط
          score = this.calculateScoreNearby(Number(ap.price));
          fraisLivraison = 0;
        } else if (sameCity) {
          // بعيد + نفس المدينة
          fraisLivraison = Number(ap.livraisonMemeVille) || 0;
          score = this.calculateScoreSameCity(Number(ap.price), fraisLivraison);
        } else {
          // بعيد + مدينة أخرى
          fraisLivraison = Number(ap.livraisonGeneral) || 0;
          score = this.calculateScoreOtherCity(
            Number(ap.price),
            fraisLivraison,
          );
        }

        return {
          adminId: ap.admin.id,
          adminProductId: ap.id,
          price: Number(ap.price),
          distance: Math.round(distance),
          score,
          fraisLivraison,
          isNearby: distance < this.DISTANCE_THRESHOLD,
          businessName: ap.admin.businessName || '',
          phone: ap.admin.phone || '',
          city: ap.admin.city || '',
          location: ap.location || '',
          quantity: ap.quantity,
          livraisonMemeVille: Number(ap.livraisonMemeVille) || 0,
          livraisonGeneral: Number(ap.livraisonGeneral) || 0,
        };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 10); // خزن أحسن 10

    // خزن أو حدث
    let preCalculated = await this.preCalculatedRepository.findOne({
      where: { locationId, globalProductId, domainId },
    });

    if (preCalculated) {
      preCalculated.offers = offers;
      preCalculated.calculatedAt = new Date();
    } else {
      preCalculated = this.preCalculatedRepository.create({
        locationId,
        globalProductId,
        domainId,
        offers,
        calculatedAt: new Date(),
      });
    }

    return this.preCalculatedRepository.save(preCalculated);
  }

  // ============================================
  // Cron Job: Pre-calculate الكل
  // ============================================

  async preCalculateAll(): Promise<{ message: string; count: number }> {
    const locations = await this.locationRepository.find({
      where: { isActive: true },
    });
    const globalProducts = await this.globalProductRepository.find({
      where: { isActive: true },
    });
    const domains = await this.domainRepository.find();

    let count = 0;

    for (const location of locations) {
      for (const domain of domains) {
        for (const product of globalProducts) {
          await this.calculateForProduct(
            location.id,
            product.id,
            domain.id,
            Number(location.latitude),
            Number(location.longitude),
            location.city, // بعث المدينة
          );
          count++;
        }
      }
    }

    return {
      message: 'Pre-calculation completed',
      count,
    };
  }

  // ============================================
  // Pre-calculate Admins لكل Location
  // ============================================

  /**
   * حساب Admins القريبين لكل Location
   * كيتستعمل للـ Common Categories
   */
  async preCalculateAdmins(): Promise<{
    message: string;
    locationsCount: number;
  }> {
    // 1. جيب جميع Locations النشطة
    const locations = await this.locationRepository.find({
      where: { isActive: true },
    });

    // 2. جيب جميع Admins النشطين
    const admins = await this.userRepository.find({
      where: {
        role: Role.ADMIN,
        isActive: true,
      },
    });

    // 3. لكل Location، حسب Distance لكل Admin و خزن Top 100
    for (const location of locations) {
      const adminsWithDistance = admins.map((admin) => {
        const distance = this.locationsService.calculateDistance(
          Number(location.latitude),
          Number(location.longitude),
          Number(admin.latitude) || 0,
          Number(admin.longitude) || 0,
        );

        return {
          adminId: admin.id,
          distance: Math.round(distance),
          businessName: admin.businessName || '',
          businessLogo: admin.businessLogo || '',
          phone: admin.phone || '',
          city: admin.city || '',
          latitude: Number(admin.latitude) || 0,
          longitude: Number(admin.longitude) || 0,
          domainId: admin.domainId || '',
        };
      });

      // رتب بالمسافة و خد Top 100
      const top100Admins = adminsWithDistance
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 100);

      // 4. خزن أو حدث
      let preCalcAdmins = await this.preCalculatedAdminsRepository.findOne({
        where: { locationId: location.id },
      });

      if (preCalcAdmins) {
        preCalcAdmins.admins = top100Admins;
        preCalcAdmins.calculatedAt = new Date();
      } else {
        preCalcAdmins = this.preCalculatedAdminsRepository.create({
          locationId: location.id,
          admins: top100Admins,
          calculatedAt: new Date(),
        });
      }

      await this.preCalculatedAdminsRepository.save(preCalcAdmins);
    }

    return {
      message: 'Admins pre-calculation completed',
      locationsCount: locations.length,
    };
  }

  /**
   * جيب Admins القريبين من Location معين
   */
  async getPreCalculatedAdmins(locationId: string) {
    const preCalcAdmins = await this.preCalculatedAdminsRepository.findOne({
      where: { locationId },
    });

    if (!preCalcAdmins) {
      throw new NotFoundException(
        `No pre-calculated admins found for location ${locationId}`,
      );
    }

    return preCalcAdmins.admins;
  }

  // ============================================
  // Pre-calculate Common Products لكل Location
  // ============================================

  // المسافة الحدية للـ Common Categories: 10 km
  private readonly COMMON_DISTANCE_THRESHOLD = 10000; // بالمتر

  /**
   * حساب Common Products لكل Location + Category
   * Admins li < 10 km
   */
  async preCalculateCommonProducts(): Promise<{
    message: string;
    locationsCount: number;
    categoriesCount: number;
  }> {
    // 1. جيب جميع Locations النشطة
    const locations = await this.locationRepository.find({
      where: { isActive: true },
    });

    // 2. جيب جميع Common Categories
    const commonCategories = await this.productCategoryRepository.find({
      where: { isCommon: true, isActive: true },
    });

    // 3. جيب جميع Domains
    const domains = await this.domainRepository.find();

    // 4. جيب جميع Admins النشطين مع products
    const admins = await this.userRepository.find({
      where: {
        role: Role.ADMIN,
        isActive: true,
      },
    });

    // 5. لكل Location + Category + Domain
    for (const location of locations) {
      for (const category of commonCategories) {
        for (const domain of domains) {
          // جيب Admins li < 10 km
          const nearbyAdmins = admins.filter((admin) => {
            if (admin.domainId !== domain.id) return false;

            const distance = this.locationsService.calculateDistance(
              Number(location.latitude),
              Number(location.longitude),
              Number(admin.latitude) || 0,
              Number(admin.longitude) || 0,
            );
            return distance < this.COMMON_DISTANCE_THRESHOLD;
          });

          // جيب AdminProducts لهاد الـ Category من هاد Admins
          const adminIds = nearbyAdmins.map((a) => a.id);

          if (adminIds.length === 0) {
            // ماكاين حتى Admin قريب، خزن فارغ
            await this.saveCommonProducts(
              location.id,
              category.id,
              domain.id,
              [],
              0,
              0,
            );
            continue;
          }

          // Query AdminProducts
          const adminProducts = await this.adminProductRepository
            .createQueryBuilder('ap')
            .leftJoinAndSelect('ap.globalProduct', 'gp')
            .leftJoinAndSelect('gp.categories', 'cat')
            .leftJoinAndSelect('ap.admin', 'admin')
            .where('ap.adminId IN (:...adminIds)', { adminIds })
            .andWhere('cat.id = :categoryId', { categoryId: category.id })
            .andWhere('ap.isAvailable = true')
            .andWhere('ap.quantity > 0')
            .andWhere('gp.isActive = true')
            .getMany();

          // Build products array
          const products = adminProducts.map((ap) => {
            const admin = nearbyAdmins.find((a) => a.id === ap.adminId)!;
            const distance = this.locationsService.calculateDistance(
              Number(location.latitude),
              Number(location.longitude),
              Number(admin.latitude) || 0,
              Number(admin.longitude) || 0,
            );

            return {
              adminId: ap.adminId,
              adminProductId: ap.id,
              globalProductId: ap.globalProductId,
              globalProductNameFr: ap.globalProduct?.nameFr || '',
              globalProductNameAr: ap.globalProduct?.nameAr || '',
              globalProductImages: ap.globalProduct?.images || [],
              price: Number(ap.price),
              quantity: ap.quantity,
              distance: Math.round(distance),
              businessName: admin.businessName || '',
              businessLogo: admin.businessLogo || '',
              phone: admin.phone || '',
              city: admin.city || '',
              livraisonMemeVille: Number(ap.livraisonMemeVille) || 0,
              livraisonGeneral: Number(ap.livraisonGeneral) || 0,
            };
          });

          // Sort by distance
          products.sort((a, b) => a.distance - b.distance);

          // Count unique admins
          const uniqueAdmins = new Set(products.map((p) => p.adminId)).size;

          // Save
          await this.saveCommonProducts(
            location.id,
            category.id,
            domain.id,
            products,
            uniqueAdmins,
            products.length,
          );
        }
      }
    }

    return {
      message: 'Common products pre-calculation completed',
      locationsCount: locations.length,
      categoriesCount: commonCategories.length,
    };
  }

  /**
   * Helper: Save or Update Common Products
   */
  private async saveCommonProducts(
    locationId: string,
    categoryId: string,
    domainId: string,
    products: PreCalculatedCommonProducts['products'],
    adminsCount: number,
    productsCount: number,
  ): Promise<void> {
    let record = await this.preCalculatedCommonRepository.findOne({
      where: { locationId, categoryId, domainId },
    });

    if (record) {
      record.products = products;
      record.adminsCount = adminsCount;
      record.productsCount = productsCount;
      record.calculatedAt = new Date();
    } else {
      record = this.preCalculatedCommonRepository.create({
        locationId,
        categoryId,
        domainId,
        products,
        adminsCount,
        productsCount,
        calculatedAt: new Date(),
      });
    }

    await this.preCalculatedCommonRepository.save(record);
  }

  /**
   * جيب Common Products لـ Location + Category
   */
  async getCommonProducts(
    locationId: string,
    categoryId: string,
    domainId: string,
  ) {
    const record = await this.preCalculatedCommonRepository.findOne({
      where: { locationId, categoryId, domainId },
    });

    if (!record) {
      throw new NotFoundException(
        `No pre-calculated common products found for this location and category`,
      );
    }

    return {
      locationId,
      categoryId,
      domainId,
      adminsCount: record.adminsCount,
      productsCount: record.productsCount,
      products: record.products,
      calculatedAt: record.calculatedAt,
    };
  }

  /**
   * Update Common Products لـ Location معين
   * كيتستعمل مثلاً وقت Admin يبدل Price أو يزيد Product
   */
  async updateCommonProductsForLocation(locationId: string): Promise<void> {
    const location = await this.locationRepository.findOne({
      where: { id: locationId },
    });

    if (!location) return;

    const commonCategories = await this.productCategoryRepository.find({
      where: { isCommon: true, isActive: true },
    });

    const domains = await this.domainRepository.find();

    const admins = await this.userRepository.find({
      where: {
        role: Role.ADMIN,
        isActive: true,
      },
    });

    for (const category of commonCategories) {
      for (const domain of domains) {
        const nearbyAdmins = admins.filter((admin) => {
          if (admin.domainId !== domain.id) return false;
          const distance = this.locationsService.calculateDistance(
            Number(location.latitude),
            Number(location.longitude),
            Number(admin.latitude) || 0,
            Number(admin.longitude) || 0,
          );
          return distance < this.COMMON_DISTANCE_THRESHOLD;
        });

        const adminIds = nearbyAdmins.map((a) => a.id);

        if (adminIds.length === 0) {
          await this.saveCommonProducts(
            location.id,
            category.id,
            domain.id,
            [],
            0,
            0,
          );
          continue;
        }

        const adminProducts = await this.adminProductRepository
          .createQueryBuilder('ap')
          .leftJoinAndSelect('ap.globalProduct', 'gp')
          .leftJoinAndSelect('gp.categories', 'cat')
          .leftJoinAndSelect('ap.admin', 'admin')
          .where('ap.adminId IN (:...adminIds)', { adminIds })
          .andWhere('cat.id = :categoryId', { categoryId: category.id })
          .andWhere('ap.isAvailable = true')
          .andWhere('ap.quantity > 0')
          .andWhere('gp.isActive = true')
          .getMany();

        const products = adminProducts.map((ap) => {
          const admin = nearbyAdmins.find((a) => a.id === ap.adminId)!;
          const distance = this.locationsService.calculateDistance(
            Number(location.latitude),
            Number(location.longitude),
            Number(admin.latitude) || 0,
            Number(admin.longitude) || 0,
          );

          return {
            adminId: ap.adminId,
            adminProductId: ap.id,
            globalProductId: ap.globalProductId,
            globalProductNameFr: ap.globalProduct?.nameFr || '',
            globalProductNameAr: ap.globalProduct?.nameAr || '',
            globalProductImages: ap.globalProduct?.images || [],
            price: Number(ap.price),
            quantity: ap.quantity,
            distance: Math.round(distance),
            businessName: admin.businessName || '',
            businessLogo: admin.businessLogo || '',
            phone: admin.phone || '',
            city: admin.city || '',
            livraisonMemeVille: Number(ap.livraisonMemeVille) || 0,
            livraisonGeneral: Number(ap.livraisonGeneral) || 0,
          };
        });

        products.sort((a, b) => a.distance - b.distance);
        const uniqueAdmins = new Set(products.map((p) => p.adminId)).size;

        await this.saveCommonProducts(
          location.id,
          category.id,
          domain.id,
          products,
          uniqueAdmins,
          products.length,
        );
      }
    }
  }

  /**
   * Update Common Products لـ Admin معين (كاملين Locations li قريبين)
   * كيتستعمل وقت Admin يبدل Product/Price أو يتسجل جديد
   */
  async updateCommonProductsForAdmin(adminId: string): Promise<void> {
    const admin = await this.userRepository.findOne({
      where: { id: adminId },
    });

    if (!admin || !admin.latitude || !admin.longitude) return;

    // جيب Locations li < 10 km من Admin
    const locations = await this.locationRepository.find({
      where: { isActive: true },
    });

    const nearbyLocations = locations.filter((loc) => {
      const distance = this.locationsService.calculateDistance(
        Number(loc.latitude),
        Number(loc.longitude),
        Number(admin.latitude),
        Number(admin.longitude),
      );
      return distance < this.COMMON_DISTANCE_THRESHOLD;
    });

    // Update كل Location
    for (const location of nearbyLocations) {
      await this.updateCommonProductsForLocation(location.id);
    }
  }

  // ============================================
  // THRESHOLD OPTIMIZATION SYSTEM
  // ============================================

  /**
   * جيب worstScore لـ Point معين
   */
  async getThreshold(
    locationId: string,
    globalProductId: string,
    domainId: string,
  ): Promise<PointThreshold | null> {
    return this.pointThresholdRepository.findOne({
      where: { locationId, globalProductId, domainId },
    });
  }

  /**
   * تحديث worstScore بعد تعديل Top 10
   */
  async updateThreshold(
    locationId: string,
    globalProductId: string,
    domainId: string,
    worstScore: number,
    offersCount: number,
  ): Promise<void> {
    let threshold = await this.getThreshold(
      locationId,
      globalProductId,
      domainId,
    );

    if (threshold) {
      threshold.worstScore = worstScore;
      threshold.offersCount = offersCount;
    } else {
      threshold = this.pointThresholdRepository.create({
        locationId,
        globalProductId,
        domainId,
        worstScore,
        offersCount,
      });
    }

    await this.pointThresholdRepository.save(threshold);
  }

  /**
   * واش Score جديد خاصو يدخل للـ Top 10?
   * TRUE إلا: Score < worstScore أو offersCount < 10
   */
  async shouldUpdateTop10(
    locationId: string,
    globalProductId: string,
    domainId: string,
    newScore: number,
  ): Promise<boolean> {
    const threshold = await this.getThreshold(
      locationId,
      globalProductId,
      domainId,
    );

    if (!threshold) {
      // ما كاين حتى threshold، يعني أول مرة → خاص يدخل
      return true;
    }

    // إلا عدد العروض < 10 → خاص يدخل
    if (threshold.offersCount < 10) {
      return true;
    }

    // إلا Score جديد < worstScore → خاص يدخل
    return newScore < Number(threshold.worstScore);
  }

  /**
   * واش Admin موجود فـ Top 10?
   */
  async isAdminInTop10(
    locationId: string,
    globalProductId: string,
    domainId: string,
    adminId: string,
  ): Promise<boolean> {
    const preCalculated = await this.preCalculatedRepository.findOne({
      where: { locationId, globalProductId, domainId },
    });

    if (!preCalculated || !preCalculated.offers) {
      return false;
    }

    return preCalculated.offers.some((offer) => offer.adminId === adminId);
  }

  /**
   * تحديث Top 10 بـ Admin جديد (Insert Sorted)
   * - يدخل Admin فـ بلاصتو حسب Score
   * - يحيد آخر واحد (رقم 11) إلا كان
   */
  async insertAdminToTop10(
    locationId: string,
    globalProductId: string,
    domainId: string,
    newOffer: {
      adminId: string;
      adminProductId: string;
      price: number;
      distance: number;
      score: number;
      fraisLivraison: number;
      isNearby: boolean;
      businessName: string;
      phone: string;
      city: string;
      location: string;
      quantity: number;
      livraisonMemeVille: number;
      livraisonGeneral: number;
    },
  ): Promise<void> {
    let preCalculated = await this.preCalculatedRepository.findOne({
      where: { locationId, globalProductId, domainId },
    });

    if (!preCalculated) {
      // أول مرة، create جديد
      preCalculated = this.preCalculatedRepository.create({
        locationId,
        globalProductId,
        domainId,
        offers: [newOffer],
        calculatedAt: new Date(),
      });
    } else {
      // حيد Admin إلا كان موجود (باش ما يتكررش)
      const offers = preCalculated.offers.filter(
        (o) => o.adminId !== newOffer.adminId,
      );

      // زيد العرض الجديد
      offers.push(newOffer);

      // رتب حسب Score (أقل = أحسن)
      offers.sort((a, b) => a.score - b.score);

      // خلي غير Top 10
      preCalculated.offers = offers.slice(0, 10);
      preCalculated.calculatedAt = new Date();
    }

    await this.preCalculatedRepository.save(preCalculated);

    // حدث Threshold
    const offersCount = preCalculated.offers.length;
    const worstScore =
      offersCount > 0 ? preCalculated.offers[offersCount - 1].score : 999999;

    await this.updateThreshold(
      locationId,
      globalProductId,
      domainId,
      worstScore,
      offersCount,
    );
  }

  /**
   * حيد Admin من Top 10 (فاش يحيد product أو quantity = 0)
   * هاد الحالة خاص RECALCULATE باش نجيبو Admin جديد بلاصتو
   */
  async removeAdminFromTop10(
    locationId: string,
    globalProductId: string,
    domainId: string,
    adminId: string,
    refLatitude: number,
    refLongitude: number,
    refCity: string,
  ): Promise<void> {
    // Recalculate كامل باش نجيبو Admin #11 بلاصة اللي حيدنا
    await this.calculateForProduct(
      locationId,
      globalProductId,
      domainId,
      refLatitude,
      refLongitude,
      refCity,
    );
  }

  /**
   * معالجة تحديث Admin Product (price, frais, quantity, availability)
   * هادي الـ method الرئيسية اللي كتسمى من AdminProductsService
   */
  async handleAdminProductUpdate(
    adminProduct: AdminProduct,
    admin: User,
    action: 'update' | 'delete' | 'unavailable',
  ): Promise<void> {
    // Admin خاصو يكون عندو domainId
    if (!admin.domainId) {
      return;
    }

    const domainId = admin.domainId;

    // جيب جميع Locations
    const locations = await this.locationRepository.find({
      where: { isActive: true },
    });

    for (const location of locations) {
      const distance = this.locationsService.calculateDistance(
        Number(location.latitude),
        Number(location.longitude),
        Number(admin.latitude) || 0,
        Number(admin.longitude) || 0,
      );

      const adminCity = admin.city || '';
      const sameCity = this.isSameCity(adminCity, location.city);

      // حساب Score جديد
      let score: number;
      let fraisLivraison: number = 0;

      if (distance < this.DISTANCE_THRESHOLD) {
        score = this.calculateScoreNearby(Number(adminProduct.price));
        fraisLivraison = 0;
      } else if (sameCity) {
        fraisLivraison = Number(adminProduct.livraisonMemeVille) || 0;
        score = this.calculateScoreSameCity(
          Number(adminProduct.price),
          fraisLivraison,
        );
      } else {
        fraisLivraison = Number(adminProduct.livraisonGeneral) || 0;
        score = this.calculateScoreOtherCity(
          Number(adminProduct.price),
          fraisLivraison,
        );
      }

      const isInTop10 = await this.isAdminInTop10(
        location.id,
        adminProduct.globalProductId,
        domainId,
        admin.id,
      );

      // إلا Admin حيد product أو quantity = 0 أو unavailable
      if (
        action === 'delete' ||
        action === 'unavailable' ||
        adminProduct.quantity === 0
      ) {
        if (isInTop10) {
          // Admin كان فـ Top 10 → Recalculate
          await this.removeAdminFromTop10(
            location.id,
            adminProduct.globalProductId,
            domainId,
            admin.id,
            Number(location.latitude),
            Number(location.longitude),
            location.city,
          );
        }
        // إلا ما كانش فـ Top 10 → ما دير والو
        continue;
      }

      // Action = update
      if (isInTop10) {
        // Admin فـ Top 10 → Update position
        await this.insertAdminToTop10(
          location.id,
          adminProduct.globalProductId,
          domainId,
          {
            adminId: admin.id,
            adminProductId: adminProduct.id,
            price: Number(adminProduct.price),
            distance: Math.round(distance),
            score,
            fraisLivraison,
            isNearby: distance < this.DISTANCE_THRESHOLD,
            businessName: admin.businessName || '',
            phone: admin.phone || '',
            city: admin.city || '',
            location: adminProduct.location || '',
            quantity: adminProduct.quantity,
            livraisonMemeVille: Number(adminProduct.livraisonMemeVille) || 0,
            livraisonGeneral: Number(adminProduct.livraisonGeneral) || 0,
          },
        );
      } else {
        // Admin ما كانش فـ Top 10 → شوف واش Score جديد < worstScore
        const shouldUpdate = await this.shouldUpdateTop10(
          location.id,
          adminProduct.globalProductId,
          domainId,
          score,
        );

        if (shouldUpdate) {
          await this.insertAdminToTop10(
            location.id,
            adminProduct.globalProductId,
            domainId,
            {
              adminId: admin.id,
              adminProductId: adminProduct.id,
              price: Number(adminProduct.price),
              distance: Math.round(distance),
              score,
              fraisLivraison,
              isNearby: distance < this.DISTANCE_THRESHOLD,
              businessName: admin.businessName || '',
              phone: admin.phone || '',
              city: admin.city || '',
              location: adminProduct.location || '',
              quantity: adminProduct.quantity,
              livraisonMemeVille: Number(adminProduct.livraisonMemeVille) || 0,
              livraisonGeneral: Number(adminProduct.livraisonGeneral) || 0,
            },
          );
        }
        // إلا Score >= worstScore → SKIP (ما دير والو)
      }
    }
  }

  // ============================================
  // SYNC ENDPOINT للـ LiteSQL
  // ============================================

  /**
   * جيب data للـ sync مع Mobile App (LiteSQL)
   * @param locationId - Location ديال Client
   * @param domainId - Domain المختار
   * @param lastSync - آخر وقت دار sync (optional)
   */
  async getSyncData(
    locationId: string,
    domainId: string,
    lastSync?: Date,
  ): Promise<{
    products: PreCalculatedProduct[];
    syncedAt: Date;
  }> {
    const queryBuilder = this.preCalculatedRepository
      .createQueryBuilder('pcp')
      .where('pcp.locationId = :locationId', { locationId })
      .andWhere('pcp.domainId = :domainId', { domainId });

    // إلا عندو lastSync، جيب غير اللي تبدلو
    if (lastSync) {
      queryBuilder.andWhere('pcp.updatedAt > :lastSync', { lastSync });
    }

    const products = await queryBuilder.getMany();

    return {
      products,
      syncedAt: new Date(),
    };
  }

  /**
   * جيب data ديال Admin معين (للـ Promo Code)
   * @param adminId - Admin اللي عطا Code Promo
   * @param locationId - Location ديال Client
   * @param domainId - Domain
   */
  async getPromoAdminProducts(
    adminId: string,
    locationId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _domainId: string,
  ): Promise<{
    products: {
      globalProductId: string;
      offer: {
        adminId: string;
        adminProductId: string;
        price: number;
        distance: number;
        score: number;
        fraisLivraison: number;
        isNearby: boolean;
        businessName: string;
        phone: string;
        city: string;
        location: string;
        quantity: number;
        livraisonMemeVille: number;
        livraisonGeneral: number;
      };
    }[];
  }> {
    // جيب Location
    const location = await this.locationRepository.findOne({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // جيب Admin
    const admin = await this.userRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // جيب جميع products ديال هاد Admin
    const adminProducts = await this.adminProductRepository.find({
      where: {
        adminId,
        isAvailable: true,
      },
    });

    // حسب Score لكل product
    const products = adminProducts
      .filter((ap) => ap.quantity > 0)
      .map((ap) => {
        const distance = this.locationsService.calculateDistance(
          Number(location.latitude),
          Number(location.longitude),
          Number(admin.latitude) || 0,
          Number(admin.longitude) || 0,
        );

        const adminCity = admin.city || '';
        const sameCity = this.isSameCity(adminCity, location.city);

        let score: number;
        let fraisLivraison: number = 0;

        if (distance < this.DISTANCE_THRESHOLD) {
          score = this.calculateScoreNearby(Number(ap.price));
          fraisLivraison = 0;
        } else if (sameCity) {
          fraisLivraison = Number(ap.livraisonMemeVille) || 0;
          score = this.calculateScoreSameCity(Number(ap.price), fraisLivraison);
        } else {
          fraisLivraison = Number(ap.livraisonGeneral) || 0;
          score = this.calculateScoreOtherCity(
            Number(ap.price),
            fraisLivraison,
          );
        }

        return {
          globalProductId: ap.globalProductId,
          offer: {
            adminId: admin.id,
            adminProductId: ap.id,
            price: Number(ap.price),
            distance: Math.round(distance),
            score,
            fraisLivraison,
            isNearby: distance < this.DISTANCE_THRESHOLD,
            businessName: admin.businessName || '',
            phone: admin.phone || '',
            city: admin.city || '',
            location: ap.location || '',
            quantity: ap.quantity,
            livraisonMemeVille: Number(ap.livraisonMemeVille) || 0,
            livraisonGeneral: Number(ap.livraisonGeneral) || 0,
          },
        };
      });

    return { products };
  }
}
