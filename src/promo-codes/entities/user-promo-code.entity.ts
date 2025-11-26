import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PromoCode } from './promo-code.entity';

@Entity('user_promo_codes')
@Unique(['userId', 'promoCodeId'])
export class UserPromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // User who owns this promo code
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Promo code
  @Column('uuid')
  promoCodeId: string;

  @ManyToOne(() => PromoCode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promoCodeId' })
  promoCode: PromoCode;

  // Who referred this user (Level 1 referrer)
  @Column('uuid', { nullable: true })
  referredBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'referredBy' })
  referrer: User | null;

  // How many people this user referred using this code
  @Column('integer', { default: 0 })
  referralCount: number;

  // Total commission earned from this promo code
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalEarned: number;

  @CreateDateColumn()
  createdAt: Date;
}
