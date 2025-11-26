import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Cart } from './cart.entity';
import { AdminProduct } from '../../admin-products/entities/admin-product.entity';

@Entity('cart_items')
@Unique(['cartId', 'adminProductId']) // منتج واحد مرة فقط في السلة
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Cart
  @Column('uuid')
  cartId: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  // Admin Product
  @Column('uuid')
  adminProductId: string;

  @ManyToOne(() => AdminProduct, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adminProductId' })
  adminProduct: AdminProduct;

  // Quantity
  @Column('integer', { default: 1 })
  quantity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
