import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { AdminProduct } from '../../admin-products/entities/admin-product.entity';
import { GlobalProduct } from '../../global-products/entities/global-product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Order
  @Column('uuid')
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  // Admin Product
  @Column('uuid')
  adminProductId: string;

  @ManyToOne(() => AdminProduct, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'adminProductId' })
  adminProduct: AdminProduct;

  // Global Product (للمرجع)
  @Column('uuid')
  globalProductId: string;

  @ManyToOne(() => GlobalProduct, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'globalProductId' })
  globalProduct: GlobalProduct;

  // Product info at time of order (snapshot)
  @Column()
  productNameFr: string;

  @Column()
  productNameAr: string;

  @Column({ type: 'varchar', nullable: true })
  productImage: string;

  // Pricing at time of order
  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;

  @Column('integer')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number; // unitPrice * quantity

  // Commission per item
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  commission: number;
}
