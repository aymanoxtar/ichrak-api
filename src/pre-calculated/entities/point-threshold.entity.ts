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

// هاد الجدول كيخزن worstScore (آخر Score فـ Top 10) لكل Point
// باش نعرفو واش Admin جديد خاصو يدخل للـ Top 10 ولا لا
@Entity('point_thresholds')
@Index(['locationId', 'globalProductId', 'domainId'], { unique: true })
export class PointThreshold {
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

  // Domain
  @Column('uuid')
  domainId: string;

  @ManyToOne(() => Domain)
  @JoinColumn({ name: 'domainId' })
  domain: Domain;

  // آخر Score فـ Top 10 (العرض رقم 10)
  // إلا Score جديد < worstScore → Admin يدخل للـ Top 10
  @Column('decimal', { precision: 10, scale: 2, default: 999999 })
  worstScore: number;

  // عدد العروض الحالية فـ Top 10
  @Column('int', { default: 0 })
  offersCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
