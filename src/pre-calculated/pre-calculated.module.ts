import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PreCalculatedService } from './pre-calculated.service';
import { PreCalculatedController } from './pre-calculated.controller';
import { PreCalculatedCronService } from './pre-calculated-cron.service';
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
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PreCalculatedProduct,
      PreCalculatedAdmins,
      PreCalculatedCommonProducts,
      PointThreshold,
      Location,
      GlobalProduct,
      AdminProduct,
      User,
      Domain,
      ProductCategory,
    ]),
    LocationsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [PreCalculatedController],
  providers: [PreCalculatedService, PreCalculatedCronService],
  exports: [PreCalculatedService],
})
export class PreCalculatedModule {}
