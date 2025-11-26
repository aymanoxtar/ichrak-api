import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PromoCode } from './promo-code.entity';
import { AdminProduct } from '../../admin-products/entities/admin-product.entity';

@Entity('promo_code_usages')
export class PromoCodeUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Promo code used
  @Column('uuid')
  promoCodeId: string;

  @ManyToOne(() => PromoCode)
  @JoinColumn({ name: 'promoCodeId' })
  promoCode: PromoCode;

  // User who used the code
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Product purchased (optional)
  @Column('uuid', { nullable: true })
  productId: string | null;

  @ManyToOne(() => AdminProduct, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product: AdminProduct | null;

  // Original price
  @Column('decimal', { precision: 10, scale: 2 })
  originalPrice: number;

  // Reduction amount
  @Column('decimal', { precision: 10, scale: 2 })
  reductionAmount: number;

  // Final price after reduction
  @Column('decimal', { precision: 10, scale: 2 })
  finalPrice: number;

  // Commission earned
  @Column('decimal', { precision: 10, scale: 2 })
  commissionAmount: number;

  // Level 1 referrer (who directly referred this user)
  @Column('uuid', { nullable: true })
  level1ReferrerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'level1ReferrerId' })
  level1Referrer: User | null;

  // Commission for Level 1 (90%)
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  level1Commission: number;

  // Level 2 referrer (who referred the Level 1 referrer)
  @Column('uuid', { nullable: true })
  level2ReferrerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'level2ReferrerId' })
  level2Referrer: User | null;

  // Commission for Level 2 (10% of Level 1)
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  level2Commission: number;

  // Super Admin commission (10% of total)
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  superAdminCommission: number;

  @CreateDateColumn()
  createdAt: Date;
}
