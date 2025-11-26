import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Location } from '../../locations/entities/location.entity';
import { GlobalProduct } from '../../global-products/entities/global-product.entity';
import { Domain } from '../../domains/entities/domain.entity';

// هاد الجدول كيخزن العروض المحسوبة مسبقاً لكل منتج في كل location
@Entity('pre_calculated_products')
@Index(['locationId', 'globalProductId', 'domainId'], { unique: true })
export class PreCalculatedProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Location (النقطة الجغرافية)
  @Column('uuid')
  locationId: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'locationId' })
  location: Location;

  // Global Product
  @Column('uuid')
  globalProductId: string;

  @ManyToOne(() => GlobalProduct)
  @JoinColumn({ name: 'globalProductId' })
  globalProduct: GlobalProduct;

  // Domain (Pièces Auto أو Droguerie)
  @Column('uuid')
  domainId: string;

  @ManyToOne(() => Domain)
  @JoinColumn({ name: 'domainId' })
  domain: Domain;

  // العروض المحسوبة (أحسن 10 عروض)
  // JSON Array
  @Column('jsonb')
  offers: {
    adminId: string;
    adminProductId: string;
    price: number;
    distance: number; // بالمتر
    score: number;
    fraisLivraison: number; // تكلفة التوصيل المحسوبة
    isNearby: boolean; // هل < 2.5 km
    businessName: string;
    phone: string;
    city: string;
    location: string;
    quantity: number;
    livraisonMemeVille: number; // Frais للمدينة نفسها
    livraisonGeneral: number; // Frais لمدن أخرى
  }[];

  // آخر تحديث
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  calculatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
