import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalProductsService } from './global-products.service';
import { GlobalProductsController } from './global-products.controller';
import { GlobalProduct } from './entities/global-product.entity';
import { ProductCategory } from '../product-categories/entities/product-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalProduct, ProductCategory])],
  controllers: [GlobalProductsController],
  providers: [GlobalProductsService],
  exports: [GlobalProductsService],
})
export class GlobalProductsModule {}
