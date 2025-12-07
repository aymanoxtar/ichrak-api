import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../users/entities/user.entity';
import { Domain } from '../domains/entities/domain.entity';
import { Service } from '../services/entities/service.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { FacebookAuthDto } from './dto/facebook-auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { Role } from '../common/enums';

interface FacebookUserResponse {
  id: string;
  name: string;
  email: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Domain)
    private domainRepository: Repository<Domain>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    private jwtService: JwtService,
  ) {}

  // Generate unique referral code (REF-XXXXXX)
  private async generateReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let exists = true;

    while (exists) {
      code = 'REF-';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.userRepository.findOne({
        where: { referralCode: code },
      });
      exists = !!existing;
    }

    return code!;
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Validate domainId if role is ADMIN
    if (registerDto.role === Role.ADMIN) {
      if (!registerDto.domainId) {
        throw new BadRequestException('Domain is required for Admin role');
      }

      const domain = await this.domainRepository.findOne({
        where: { id: registerDto.domainId },
      });

      if (!domain) {
        throw new BadRequestException('Invalid domain');
      }
    }

    // Validate serviceIds if role is ARTISAN
    let services: Service[] = [];
    if (registerDto.role === Role.ARTISAN) {
      if (!registerDto.serviceIds || registerDto.serviceIds.length === 0) {
        throw new BadRequestException(
          'At least one service is required for Artisan role',
        );
      }

      // Validate all service IDs
      services = await this.serviceRepository.find({
        where: registerDto.serviceIds.map((id) => ({ id, isActive: true })),
      });

      if (services.length !== registerDto.serviceIds.length) {
        throw new BadRequestException(
          'One or more services are invalid or inactive',
        );
      }

      if (!registerDto.phone) {
        throw new BadRequestException('Phone is required for Artisan role');
      }

      if (!registerDto.city) {
        throw new BadRequestException('City is required for Artisan role');
      }
    }

    // Handle referral code - find referrer
    let referredById: string | null = null;
    if (registerDto.referralCode) {
      const referrer = await this.userRepository.findOne({
        where: { referralCode: registerDto.referralCode.toUpperCase() },
      });

      if (referrer) {
        referredById = referrer.id;
        // Increment referrer's referral count
        await this.userRepository.increment(
          { id: referrer.id },
          'referralCount',
          1,
        );
      }
    }

    // Generate unique referral code for new user
    const newReferralCode = await this.generateReferralCode();

    // Create user (exclude serviceIds from spread - handled separately)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { serviceIds, ...userData } = registerDto;
    const user = this.userRepository.create({
      ...userData,
      referralCode: newReferralCode,
      referredById,
      services: services, // Assign services array for ManyToMany
    });
    await this.userRepository.save(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return {
      user: result,
      token: this.generateToken(user),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['domain'],
    });

    if (!user || !(await user.validatePassword(loginDto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return {
      user: result,
      token: this.generateToken(user),
    };
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  // OAuth Google Authentication
  async googleAuth(googleAuthDto: GoogleAuthDto) {
    try {
      // Initialize Google OAuth client (use your Google Client ID from Supabase)
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

      // Verify the Google token
      const ticket = await client.verifyIdToken({
        idToken: googleAuthDto.token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      // Check if user exists by googleId or email
      let user = await this.userRepository.findOne({
        where: [{ googleId: payload.sub }, { email: payload.email }],
      });

      if (user) {
        // User exists - update googleId if not set
        if (!user.googleId) {
          user.googleId = payload.sub;
          user.authProvider = 'google';
          await this.userRepository.save(user);
        }
      } else {
        // Create new user with referral code
        const referralCode = await this.generateReferralCode();
        user = this.userRepository.create({
          email: payload.email,
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
          googleId: payload.sub,
          authProvider: 'google',
          profileImage: payload.picture,
          role: Role.CLIENT, // Default role
          isActive: true,
          referralCode,
        });
        await this.userRepository.save(user);
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return {
        user: result,
        token: this.generateToken(user),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException(
        'Google authentication failed: ' + errorMessage,
      );
    }
  }

  // Generate API Key for Admin (static token for PHP site integration)
  async generateApiKey(user: User): Promise<{ apiKey: string }> {
    // Generate unique API key: ak_{userId-short}_{random}
    const userIdShort = user.id.substring(0, 8);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const apiKey = `ak_${userIdShort}_${randomPart}`;

    // Save to user
    await this.userRepository.update(user.id, { apiKey });

    return { apiKey };
  }

  // Validate API Key and return user
  async validateApiKey(apiKey: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { apiKey, isActive: true },
      relations: ['domain'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid API Key');
    }

    return user;
  }

  // OAuth Facebook Authentication
  async facebookAuth(facebookAuthDto: FacebookAuthDto) {
    try {
      // Verify Facebook token by calling Facebook Graph API
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${facebookAuthDto.token}`,
      );

      if (!response.ok) {
        throw new UnauthorizedException('Invalid Facebook token');
      }

      const facebookUser = (await response.json()) as FacebookUserResponse;

      if (!facebookUser.email) {
        throw new BadRequestException('Email is required from Facebook');
      }

      // Check if user exists by facebookId or email
      let user = await this.userRepository.findOne({
        where: [{ facebookId: facebookUser.id }, { email: facebookUser.email }],
      });

      if (user) {
        // User exists - update facebookId if not set
        if (!user.facebookId) {
          user.facebookId = facebookUser.id;
          user.authProvider = 'facebook';
          await this.userRepository.save(user);
        }
      } else {
        // Create new user with referral code
        const referralCode = await this.generateReferralCode();
        const nameParts = facebookUser.name.split(' ');
        user = this.userRepository.create({
          email: facebookUser.email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          facebookId: facebookUser.id,
          authProvider: 'facebook',
          profileImage: facebookUser.picture?.data?.url,
          role: Role.CLIENT, // Default role
          isActive: true,
          referralCode,
        });
        await this.userRepository.save(user);
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return {
        user: result,
        token: this.generateToken(user),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException(
        'Facebook authentication failed: ' + errorMessage,
      );
    }
  }
}
