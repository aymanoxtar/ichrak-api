import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderStatus } from '../../common/enums';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Order number للعرض (مثلاً: ORD-20251124-001)
  @Column({ unique: true })
  orderNumber: string;

  // Client اللي دار الطلبية
  @Column('uuid')
  clientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: User;

  // Admin اللي عندو المنتجات (كل طلبية لـ Admin واحد)
  @Column('uuid')
  adminId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adminId' })
  admin: User;

  // Order Items
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  // Status
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  // Pricing
  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number; // مجموع المنتجات

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  deliveryFee: number; // تكلفة التوصيل

  @Column('decimal', { precision: 10, scale: 2 })
  total: number; // المجموع الكلي

  // Commission (للـ Promo Code system)
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalCommission: number;

  // Promo Code (اختياري)
  @Column('uuid', { nullable: true })
  promoCodeId: string | null;

  // Delivery Address
  @Column()
  deliveryAddress: string;

  @Column()
  deliveryCity: string;

  @Column({ nullable: true })
  deliveryPhone: string;

  // Client Location (للتوصيل)
  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  clientLatitude: number;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  clientLongitude: number;

  // Notes
  @Column('text', { nullable: true })
  clientNotes: string; // ملاحظات Client

  @Column('text', { nullable: true })
  adminNotes: string; // ملاحظات Admin

  // Cancellation
  @Column({ nullable: true })
  cancelReason: string;

  @Column({ nullable: true })
  cancelledBy: string; // 'CLIENT' | 'ADMIN'

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  // Delivery tracking
  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  shippedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
