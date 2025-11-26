import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ProductCategory } from '../../product-categories/entities/product-category.entity';

@Entity('global_products')
export class GlobalProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Bilingual names (required)
  @Column()
  nameFr: string;

  @Column()
  nameAr: string;

  // Bilingual descriptions
  @Column('text', { nullable: true })
  descriptionFr: string;

  @Column('text', { nullable: true })
  descriptionAr: string;

  // Search keywords - stored as array for better search
  @Column('simple-array', { nullable: true })
  keywordsFr: string[];

  @Column('simple-array', { nullable: true })
  keywordsAr: string[];

  // Images (1 to 5 URLs)
  @Column('simple-array', { nullable: true })
  images: string[];

  // Videos (optional URLs)
  @Column('simple-array', { nullable: true })
  videos: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  viewCount: number;

  // Many-to-Many relationship with ProductCategory
  @ManyToMany(() => ProductCategory, (category) => category.products, {
    cascade: true,
  })
  @JoinTable({
    name: 'product_category_mapping',
    joinColumn: { name: 'productId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories: ProductCategory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
