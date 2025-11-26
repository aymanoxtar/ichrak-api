import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCodesService } from './promo-codes.service';
import { PromoCodesController } from './promo-codes.controller';
import { PromoCode } from './entities/promo-code.entity';
import { UserPromoCode } from './entities/user-promo-code.entity';
import { PromoCodeUsage } from './entities/promo-code-usage.entity';
import { AdminProduct } from '../admin-products/entities/admin-product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromoCode,
      UserPromoCode,
      PromoCodeUsage,
      AdminProduct,
    ]),
  ],
  controllers: [PromoCodesController],
  providers: [PromoCodesService],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
