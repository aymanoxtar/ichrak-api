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
import { ProductCategory } from '../../product-categories/entities/product-category.entity';
import { Domain } from '../../domains/entities/domain.entity';

// هاد الجدول كيخزن Products ديال Common Categories لكل Location
// كيتستعمل للـ LiteSQL باش يكون Response سريع + Offline
@Entity('pre_calculated_common_products')
@Index(['locationId', 'categoryId', 'domainId'], { unique: true })
export class PreCalculatedCommonProducts {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Location (النقطة الجغرافية)
  @Column('uuid')
  locationId: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'locationId' })
  location: Location;

  // Common Category (PPR, Robinet, etc.)
  @Column('uuid')
  categoryId: string;

  @ManyToOne(() => ProductCategory)
  @JoinColumn({ name: 'categoryId' })
  category: ProductCategory;

  // Domain (Pièces Auto أو Droguerie)
  @Column('uuid')
  domainId: string;

  @ManyToOne(() => Domain)
  @JoinColumn({ name: 'domainId' })
  domain: Domain;

  // Products ديال Admins li < 10 km
  // بلا Score - غير Distance
  @Column('jsonb')
  products: {
    adminId: string;
    adminProductId: string;
    globalProductId: string;
    globalProductNameFr: string;
    globalProductNameAr: string;
    globalProductImages: string[];
    price: number;
    quantity: number;
    distance: number; // بالمتر
    businessName: string;
    businessLogo: string;
    phone: string;
    city: string;
    livraisonMemeVille: number;
    livraisonGeneral: number;
  }[];

  // عدد Admins في هاد الـ Category
  @Column('integer', { default: 0 })
  adminsCount: number;

  // عدد Products
  @Column('integer', { default: 0 })
  productsCount: number;

  // آخر تحديث
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  calculatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
