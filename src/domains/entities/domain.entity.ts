import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DomainType } from '../../common/enums';
import { Category } from '../../categories/entities/category.entity';

@Entity('domains')
export class Domain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: DomainType,
    unique: true,
  })
  type: DomainType;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => Category, (category) => category.domain)
  categories: Category[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
