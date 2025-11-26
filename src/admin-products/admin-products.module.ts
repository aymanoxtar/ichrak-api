import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminProductsService } from './admin-products.service';
import { AdminProductsController } from './admin-products.controller';
import { AdminProduct } from './entities/admin-product.entity';
import { GlobalProduct } from '../global-products/entities/global-product.entity';
import { PreCalculatedModule } from '../pre-calculated/pre-calculated.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminProduct, GlobalProduct]),
    forwardRef(() => PreCalculatedModule),
  ],
  controllers: [AdminProductsController],
  providers: [AdminProductsService],
  exports: [AdminProductsService],
})
export class AdminProductsModule {}
