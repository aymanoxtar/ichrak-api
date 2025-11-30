import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { User } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  findAll(@Query('role') role?: Role) {
    if (role) {
      return this.usersService.findByRole(role);
    }
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.SUPER_ADMIN)
  toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  /**
   * Reset password - Generate random password
   * POST /users/:id/reset-password
   * Super Admin only
   * Returns: { newPassword: "abc12345" }
   */
  @Post(':id/reset-password')
  @Roles(Role.SUPER_ADMIN)
  resetPassword(@Param('id') id: string) {
    return this.usersService.resetPassword(id);
  }

  /**
   * Reset password - Set custom password
   * POST /users/:id/reset-password-custom
   * Super Admin only
   * Body: { password: "newPassword123" }
   */
  @Post(':id/reset-password-custom')
  @Roles(Role.SUPER_ADMIN)
  resetPasswordCustom(
    @Param('id') id: string,
    @Body('password') password: string,
  ) {
    return this.usersService.resetPasswordCustom(id, password);
  }

  // ============================================
  // Referral System Endpoints
  // ============================================

  @Get('me/referral-code')
  @ApiOperation({ summary: 'Get my referral code' })
  @ApiResponse({ status: 200, description: 'Returns user referral code' })
  getMyReferralCode(@CurrentUser() user: User) {
    return this.usersService.getReferralInfo(user.id);
  }

  @Get('me/referral-earnings')
  @ApiOperation({ summary: 'Get my referral earnings' })
  @ApiResponse({
    status: 200,
    description: 'Returns referral earnings details',
  })
  getMyReferralEarnings(@CurrentUser() user: User) {
    return this.usersService.getReferralEarnings(user.id);
  }

  @Get('me/referrals')
  @ApiOperation({ summary: 'Get list of users I referred' })
  @ApiResponse({ status: 200, description: 'Returns list of referred users' })
  getMyReferrals(@CurrentUser() user: User) {
    return this.usersService.getMyReferrals(user.id);
  }
}
