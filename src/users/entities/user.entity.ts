import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  BeforeInsert,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums';
import { Domain } from '../../domains/entities/domain.entity';
import { Service } from '../../services/entities/service.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.CLIENT,
  })
  role: Role;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  profileImage: string;

  // For ARTISAN and ADMIN roles
  @Column({ nullable: true })
  businessName: string;

  @Column({ nullable: true })
  businessDescription: string;

  @Column({ nullable: true })
  businessLogo: string;

  // Domain for ADMIN role (Droguerie or Pièces Auto)
  @Column('uuid', { nullable: true })
  domainId: string | null;

  @ManyToOne(() => Domain, { nullable: true })
  @JoinColumn({ name: 'domainId' })
  domain: Domain | null;

  // Services for ARTISAN role (linked to Service → Category)
  // Artisan can provide multiple services
  @ManyToMany(() => Service)
  @JoinTable({
    name: 'user_services', // Junction table
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'serviceId', referencedColumnName: 'id' },
  })
  services: Service[];

  // Geolocation (للتوصيل - يتزاد mor Client يبغي يشري)
  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 8 })
  longitude: number;

  // OAuth Authentication
  @Column({ nullable: true })
  authProvider: string; // 'email' | 'google' | 'facebook'

  @Column({ nullable: true })
  googleId: string; // Google user ID

  @Column({ nullable: true })
  facebookId: string; // Facebook user ID

  // Referral System
  @Column({ unique: true, nullable: true })
  referralCode: string; // Code unique l kol user (ex: "REF-ABC123")

  @Column('uuid', { nullable: true })
  referredById: string | null; // Chkun jab had user

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'referredById' })
  referredBy: User | null;

  // Referral earnings tracking
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  referralEarnings: number; // Total commission earned from referrals

  @Column('integer', { default: 0 })
  referralCount: number; // How many users this user referred

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
