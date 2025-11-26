import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart, CartItem } from './entities';
import { AdminProduct } from '../admin-products/entities/admin-product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, AdminProduct])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
