import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // مثال: "Casa - Maarif", "Casa - Hay Mohammadi"

  @Column()
  city: string; // مثال: "Casablanca", "Rabat"

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  order: number; // ترتيب النقاط في المدينة

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
