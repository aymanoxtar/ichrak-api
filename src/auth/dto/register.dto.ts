import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateIf,
  IsNotEmpty,
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

  // Required for ADMIN role (Droguerie or Pièces Auto)
  @IsOptional()
  @IsUUID()
  domainId?: string;

  // Required for ARTISAN - The service they provide
  @ValidateIf((o: RegisterDto) => o.role === Role.ARTISAN)
  @IsNotEmpty({ message: 'Service ID is required for artisans' })
  @IsUUID()
  serviceId?: string;

  // Referral code (optional) - code dyal user li jab had user
  @IsOptional()
  @IsString()
  referralCode?: string;
}
