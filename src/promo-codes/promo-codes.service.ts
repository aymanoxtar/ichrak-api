import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromoCode } from './entities/promo-code.entity';
import { UserPromoCode } from './entities/user-promo-code.entity';
import { PromoCodeUsage } from './entities/promo-code-usage.entity';
import { User } from '../users/entities/user.entity';
import { AdminProduct } from '../admin-products/entities/admin-product.entity';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { UsePromoCodeDto } from './dto/use-promo-code.dto';
// Role import removed - not used

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectRepository(PromoCode)
    private promoCodeRepository: Repository<PromoCode>,
    @InjectRepository(UserPromoCode)
    private userPromoCodeRepository: Repository<UserPromoCode>,
    @InjectRepository(PromoCodeUsage)
    private usageRepository: Repository<PromoCodeUsage>,
    @InjectRepository(AdminProduct)
    private adminProductRepository: Repository<AdminProduct>,
  ) {}

  // Admin creates promo code
  async create(createDto: CreatePromoCodeDto, admin: User): Promise<PromoCode> {
    const existing = await this.promoCodeRepository.findOne({
      where: { code: createDto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException('Promo code already exists');
    }

    const promoCode = this.promoCodeRepository.create({
      ...createDto,
      code: createDto.code.toUpperCase(),
      adminId: admin.id,
    });

    return this.promoCodeRepository.save(promoCode);
  }

  // Assign promo code to a user (Client or Artisan)
  async assignToUser(
    code: string,
    userId: string,
    referredBy?: string,
  ): Promise<UserPromoCode> {
    const promoCode = await this.promoCodeRepository.findOne({
      where: { code: code.toUpperCase(), isActive: true },
    });

    if (!promoCode) {
      throw new NotFoundException('Promo code not found or inactive');
    }

    // Check if user already has this promo code
    const existing = await this.userPromoCodeRepository.findOne({
      where: { userId, promoCodeId: promoCode.id },
    });

    if (existing) {
      throw new ConflictException('User already has this promo code');
    }

    const userPromoCode = this.userPromoCodeRepository.create({
      userId,
      promoCodeId: promoCode.id,
      referredBy: referredBy || null,
    });

    return this.userPromoCodeRepository.save(userPromoCode);
  }

  // Use promo code and calculate commissions
  async usePromoCode(
    useDto: UsePromoCodeDto,
    user: User,
  ): Promise<PromoCodeUsage> {
    const promoCode = await this.promoCodeRepository.findOne({
      where: { code: useDto.code.toUpperCase(), isActive: true },
      relations: ['admin'],
    });

    if (!promoCode) {
      throw new NotFoundException('Promo code not found or inactive');
    }

    // Check expiration
    if (promoCode.expiresAt && new Date() > promoCode.expiresAt) {
      throw new BadRequestException('Promo code has expired');
    }

    // Check max uses
    if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
      throw new BadRequestException('Promo code usage limit reached');
    }

    // Get product with commission (if productId is provided)
    let commissionAmount = 0;
    if (useDto.productId) {
      const product = await this.adminProductRepository.findOne({
        where: { id: useDto.productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      commissionAmount = Number(product.commission);
    }

    // No reduction - client pays full price
    const reductionAmount = 0;
    const finalPrice = useDto.amount;

    // Get referral chain
    const userPromo = await this.userPromoCodeRepository.findOne({
      where: { userId: user.id, promoCodeId: promoCode.id },
      relations: ['referrer'],
    });

    let level1ReferrerId: string | null = null;
    let level2ReferrerId: string | null = null;
    let level1Commission = 0;
    let level2Commission = 0;
    let superAdminCommission = 0;

    if (userPromo && userPromo.referredBy) {
      // Level 1: Direct referrer gets 90% of commission
      level1ReferrerId = userPromo.referredBy;
      level1Commission = commissionAmount * 0.9;

      // Super Admin gets 10% of commission
      superAdminCommission = commissionAmount * 0.1;

      // Check if Level 1 was also referred (Level 2)
      const level1Promo = await this.userPromoCodeRepository.findOne({
        where: { userId: level1ReferrerId, promoCodeId: promoCode.id },
      });

      if (level1Promo && level1Promo.referredBy) {
        // Level 2: Gets 10% of Level 1's commission
        level2ReferrerId = level1Promo.referredBy;
        level2Commission = level1Commission * 0.1;

        // Adjust Level 1 commission (90% of original)
        level1Commission = level1Commission * 0.9;
      }

      // Update referrer statistics
      if (level1ReferrerId) {
        await this.userPromoCodeRepository.update(
          { userId: level1ReferrerId, promoCodeId: promoCode.id },
          {
            referralCount: () => '"referralCount" + 1',
            totalEarned: () => `"totalEarned" + ${level1Commission}`,
          },
        );
      }

      if (level2ReferrerId) {
        await this.userPromoCodeRepository.update(
          { userId: level2ReferrerId, promoCodeId: promoCode.id },
          {
            totalEarned: () => `"totalEarned" + ${level2Commission}`,
          },
        );
      }
    }

    // Create usage record
    const usage = this.usageRepository.create({
      promoCodeId: promoCode.id,
      userId: user.id,
      productId: useDto.productId || null,
      originalPrice: useDto.amount,
      reductionAmount,
      finalPrice,
      commissionAmount,
      level1ReferrerId,
      level1Commission,
      level2ReferrerId,
      level2Commission,
      superAdminCommission,
    });

    await this.usageRepository.save(usage);

    // Increment usage count
    await this.promoCodeRepository.update(promoCode.id, {
      usedCount: () => '"usedCount" + 1',
    });

    const savedUsage = await this.usageRepository.findOne({
      where: { id: usage.id },
      relations: ['promoCode', 'user', 'level1Referrer', 'level2Referrer'],
    });

    if (!savedUsage) {
      throw new NotFoundException('Usage record not found');
    }

    return savedUsage;
  }

  // Get all promo codes (Admin only)
  async findAll(): Promise<PromoCode[]> {
    return this.promoCodeRepository.find({
      relations: ['admin'],
      order: { createdAt: 'DESC' },
    });
  }

  // Get promo codes created by an admin
  async findByAdmin(adminId: string): Promise<PromoCode[]> {
    return this.promoCodeRepository.find({
      where: { adminId },
      order: { createdAt: 'DESC' },
    });
  }

  // Get user's promo codes
  async findByUser(userId: string): Promise<UserPromoCode[]> {
    return this.userPromoCodeRepository.find({
      where: { userId },
      relations: ['promoCode', 'promoCode.admin', 'referrer'],
      order: { createdAt: 'DESC' },
    });
  }

  // Get usage history
  async getUsageHistory(
    userId?: string,
    promoCodeId?: string,
  ): Promise<PromoCodeUsage[]> {
    const query = this.usageRepository
      .createQueryBuilder('usage')
      .leftJoinAndSelect('usage.promoCode', 'promoCode')
      .leftJoinAndSelect('usage.user', 'user')
      .leftJoinAndSelect('usage.level1Referrer', 'level1')
      .leftJoinAndSelect('usage.level2Referrer', 'level2')
      .orderBy('usage.createdAt', 'DESC');

    if (userId) {
      query.where('usage.userId = :userId', { userId });
    }

    if (promoCodeId) {
      query.andWhere('usage.promoCodeId = :promoCodeId', { promoCodeId });
    }

    return query.getMany();
  }

  // Get referral earnings for a user
  async getReferralEarnings(userId: string): Promise<{
    promoCodes: UserPromoCode[];
    level1Earnings: number;
    level2Earnings: number;
    totalEarnings: number;
  }> {
    const promoCodes = await this.userPromoCodeRepository.find({
      where: { userId },
      relations: ['promoCode'],
    });

    const level1Earnings: { total: string | null } | undefined =
      await this.usageRepository
        .createQueryBuilder('usage')
        .select('SUM(usage.level1Commission)', 'total')
        .where('usage.level1ReferrerId = :userId', { userId })
        .getRawOne();

    const level2Earnings: { total: string | null } | undefined =
      await this.usageRepository
        .createQueryBuilder('usage')
        .select('SUM(usage.level2Commission)', 'total')
        .where('usage.level2ReferrerId = :userId', { userId })
        .getRawOne();

    const l1Total = parseFloat(level1Earnings?.total ?? '0');
    const l2Total = parseFloat(level2Earnings?.total ?? '0');

    return {
      promoCodes,
      level1Earnings: l1Total,
      level2Earnings: l2Total,
      totalEarnings: l1Total + l2Total,
    };
  }

  async findOne(id: string): Promise<PromoCode> {
    const promoCode = await this.promoCodeRepository.findOne({
      where: { id },
      relations: ['admin'],
    });

    if (!promoCode) {
      throw new NotFoundException('Promo code not found');
    }

    return promoCode;
  }

  async update(id: string, updateDto: UpdatePromoCodeDto): Promise<PromoCode> {
    const promoCode = await this.findOne(id);

    if (updateDto.code) {
      updateDto.code = updateDto.code.toUpperCase();
    }

    Object.assign(promoCode, updateDto);
    return this.promoCodeRepository.save(promoCode);
  }

  async remove(id: string): Promise<void> {
    const promoCode = await this.findOne(id);
    await this.promoCodeRepository.remove(promoCode);
  }

  async toggleActive(id: string): Promise<PromoCode> {
    const promoCode = await this.findOne(id);
    promoCode.isActive = !promoCode.isActive;
    return this.promoCodeRepository.save(promoCode);
  }
}
