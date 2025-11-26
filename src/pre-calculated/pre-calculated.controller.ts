import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PreCalculatedService } from './pre-calculated.service';
import {
  GetProductOffersDto,
  GetProductsForAppDto,
  SyncDataDto,
  GetPromoAdminProductsDto,
} from './dto/get-products.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Pre-Calculated')
@Controller('app')
export class PreCalculatedController {
  constructor(private readonly preCalculatedService: PreCalculatedService) {}

  // ============================================
  // Endpoints للـ Mobile App
  // ============================================

  /**
   * جميع المنتجات للصفحة الرئيسية
   * GET /app/products?latitude=33.5731&longitude=-7.5898&domainId=xxx&page=1&limit=20
   */
  @Get('products')
  getAllProducts(@Query() dto: GetProductsForAppDto) {
    return this.preCalculatedService.getAllProductsForApp(
      dto.latitude,
      dto.longitude,
      dto.domainId,
      dto.page,
      dto.limit,
    );
  }

  /**
   * 3 عروض لمنتج معين
   * GET /app/product-offers?globalProductId=xxx&latitude=33.5731&longitude=-7.5898&domainId=xxx&promoCodeAdminId=xxx
   */
  @Get('product-offers')
  getProductOffers(@Query() dto: GetProductOffersDto) {
    return this.preCalculatedService.getProductOffers(dto);
  }

  // ============================================
  // Sync Endpoint للـ LiteSQL
  // ============================================

  /**
   * Sync data للـ Mobile App (LiteSQL)
   * GET /app/sync?locationId=xxx&domainId=xxx&lastSync=2025-01-01T00:00:00Z
   *
   * - locationId: Location ديال Client
   * - domainId: Domain المختار
   * - lastSync: (optional) آخر وقت دار sync - باش يجيب غير اللي تبدلو
   */
  @Get('sync')
  getSyncData(@Query() dto: SyncDataDto) {
    const lastSync = dto.lastSync ? new Date(dto.lastSync) : undefined;
    return this.preCalculatedService.getSyncData(
      dto.locationId,
      dto.domainId,
      lastSync,
    );
  }

  // ============================================
  // Promo Code Endpoint
  // ============================================

  /**
   * جيب products ديال Admin معين (للـ Promo Code)
   * GET /app/promo-admin-products?adminId=xxx&locationId=xxx&domainId=xxx
   *
   * Client اللي عندو Code Promo كيستعمل هاد الـ endpoint باش:
   * 1. يجيب products ديال Admin اللي عطاه Code
   * 2. يخزنهم فـ LiteSQL
   * 3. يعرضهم مع logic دال Promo (Admin ديالو الأول)
   */
  @Get('promo-admin-products')
  getPromoAdminProducts(@Query() dto: GetPromoAdminProductsDto) {
    return this.preCalculatedService.getPromoAdminProducts(
      dto.adminId,
      dto.locationId,
      dto.domainId,
    );
  }

  // ============================================
  // Endpoints للـ Admin (Pre-calculation)
  // ============================================

  /**
   * تشغيل Pre-calculate يدوياً (Super Admin فقط)
   * POST /app/pre-calculate
   */
  @Post('pre-calculate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  preCalculateAll() {
    return this.preCalculatedService.preCalculateAll();
  }

  /**
   * تشغيل Pre-calculate Admins يدوياً (Super Admin فقط)
   * POST /app/pre-calculate-admins
   */
  @Post('pre-calculate-admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  preCalculateAdmins() {
    return this.preCalculatedService.preCalculateAdmins();
  }

  /**
   * تشغيل Pre-calculate Common Products يدوياً (Super Admin فقط)
   * POST /app/pre-calculate-common
   */
  @Post('pre-calculate-common')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  preCalculateCommonProducts() {
    return this.preCalculatedService.preCalculateCommonProducts();
  }

  // ============================================
  // Common Products Endpoints للـ Mobile App
  // ============================================

  /**
   * جيب Common Products لـ Location + Category
   * GET /app/common-products?locationId=xxx&categoryId=xxx&domainId=xxx
   *
   * للـ LiteSQL sync
   */
  @Get('common-products')
  getCommonProducts(
    @Query('locationId') locationId: string,
    @Query('categoryId') categoryId: string,
    @Query('domainId') domainId: string,
  ) {
    return this.preCalculatedService.getCommonProducts(
      locationId,
      categoryId,
      domainId,
    );
  }
}
