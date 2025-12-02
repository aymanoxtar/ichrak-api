import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateIf,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Role } from '../../common/enums';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  // Required for ARTISAN
  @ValidateIf((o: RegisterDto) => o.role === Role.ARTISAN)
  @IsNotEmpty({ message: 'Phone is required for artisans' })
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  // Required for ARTISAN
  @ValidateIf((o: RegisterDto) => o.role === Role.ARTISAN)
  @IsNotEmpty({ message: 'City is required for artisans' })
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  businessDescription?: string;

  @IsOptional()
  @IsString()
  businessLogo?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  // Required for ADMIN role (Droguerie or Pièces Auto)
  @IsOptional()
  @IsUUID()
  domainId?: string;

  // Required for ARTISAN - The services they provide (multiple)
  @ValidateIf((o: RegisterDto) => o.role === Role.ARTISAN)
  @IsArray({ message: 'Service IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one service is required for artisans' })
  @IsUUID('4', { each: true, message: 'Each service ID must be a valid UUID' })
  serviceIds?: string[];

  // Referral code (optional) - code dyal user li jab had user
  @IsOptional()
  @IsString()
  referralCode?: string;
}
