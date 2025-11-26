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

// هاد الجدول كيخزن Admins القريبين لكل Location
// كيتستعمل للـ Common Categories باش يكون Response سريع
@Entity('pre_calculated_admins')
@Index(['locationId'], { unique: true })
export class PreCalculatedAdmins {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Location (النقطة الجغرافية)
  @Column('uuid')
  locationId: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'locationId' })
  location: Location;

  // Admins القريبين (مرتبين بالمسافة)
  // JSON Array - Top 100 Admin الأقرب
  @Column('jsonb')
  admins: {
    adminId: string;
    distance: number; // بالمتر
    businessName: string;
    businessLogo: string;
    phone: string;
    city: string;
    latitude: number;
    longitude: number;
    domainId: string;
  }[];

  // آخر تحديث
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  calculatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
