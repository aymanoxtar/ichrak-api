import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  ManyToMany,
} from 'typeorm';
import { GlobalProduct } from '../../global-products/entities/global-product.entity';
import { Domain } from '../../domains/entities/domain.entity';

@Entity('product_categories')
export class ProductCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nameFr: string;

  @Column()
  nameAr: string;

  @Column({ nullable: true })
  descriptionFr: string;

  @Column({ nullable: true })
  descriptionAr: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  isActive: boolean;

  // Produits communs (chez la majorité des admins)
  // true = Catégorie commune (PPR, Robinet, Qwads, etc.) → Affichage par admin
  // false = Catégorie spécialisée → Logique Points standard
  @Column({ default: false })
  isCommon: boolean;

  // Domain (PIECE_AUTO or DROGUERIE)
  @Column('uuid', { nullable: true })
  domainId: string | null;

  @ManyToOne(() => Domain, { nullable: true })
  @JoinColumn({ name: 'domainId' })
  domain: Domain | null;

  // Hierarchical relationship - Self-referencing
  @Column('uuid', { nullable: true })
  parentId: string | null;

  @ManyToOne(() => ProductCategory, (category) => category.children, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent: ProductCategory | null;

  @OneToMany(() => ProductCategory, (category) => category.parent)
  children: ProductCategory[];

  // Many-to-Many with GlobalProduct
  @ManyToMany(() => GlobalProduct, (product) => product.categories)
  products: GlobalProduct[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
