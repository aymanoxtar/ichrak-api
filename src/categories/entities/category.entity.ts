import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CategoryType } from '../../common/enums';
import { Domain } from '../../domains/entities/domain.entity';
import { Service } from '../../services/entities/service.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: CategoryType,
    unique: true,
  })
  type: CategoryType;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  icon: string;

  @Column('uuid')
  domainId: string;

  @ManyToOne(() => Domain, (domain) => domain.categories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'domainId' })
  domain: Domain;

  @OneToMany(() => Service, (service) => service.category)
  services: Service[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
