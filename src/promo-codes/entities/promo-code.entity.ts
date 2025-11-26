import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('promo_codes')
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Unique code (e.g., "CASA15", "PROMO2025")
  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  description: string;

  // Admin who created this promo code
  @Column('uuid')
  adminId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adminId' })
  admin: User;

  // Max uses (null = unlimited)
  @Column('integer', { nullable: true })
  maxUses: number;

  // Current usage count
  @Column('integer', { default: 0 })
  usedCount: number;

  // Expiration date (null = no expiration)
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
