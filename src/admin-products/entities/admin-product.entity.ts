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
import { GlobalProduct } from '../../global-products/entities/global-product.entity';
import { User } from '../../users/entities/user.entity';

@Entity('admin_products')
@Unique(['adminId', 'globalProductId']) // Admin can have each global product only once
export class AdminProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Reference to Global Product (from catalog)
  @Column('uuid')
  globalProductId: string;

  @ManyToOne(() => GlobalProduct, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'globalProductId' })
  globalProduct: GlobalProduct;

  // Admin who owns this product instance
  @Column('uuid')
  adminId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adminId' })
  admin: User;

  // Admin-specific pricing
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  // Admin-specific quantity in stock
  @Column('integer', { default: 0 })
  quantity: number;

  // Commission per sale (fixed amount in MAD)
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  commission: number;

  // Shop location
  @Column()
  location: string;

  @Column({ nullable: true })
  locationDetails: string;

  // Optional: Admin can add their own notes
  @Column('text', { nullable: true })
  notes: string;

  // Availability status
  @Column({ default: true })
  isAvailable: boolean;

  // Frais de livraison
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  livraisonMemeVille: number; // تكلفة التوصيل داخل نفس المدينة

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  livraisonGeneral: number; // تكلفة التوصيل لمدن أخرى

  // Statistics
  @Column('integer', { default: 0 })
  viewCount: number;

  @Column('integer', { default: 0 })
  soldCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
