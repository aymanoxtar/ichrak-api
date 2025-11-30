import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Admin - Referral Management')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============================================
  // Referral System Management (SUPER_ADMIN only)
  // ============================================

  @Get('referral-stats')
  @ApiOperation({
    summary: 'Get referral system statistics (Super Admin)',
    description:
      'Returns total earnings, user stats, commission breakdown, and top referrers',
  })
  @ApiResponse({
    status: 200,
    description: 'Referral statistics',
    schema: {
      example: {
        superAdminEarnings: { total: 1500.0, pending: 300.0 },
        users: { total: 100, withReferralCode: 100, referred: 45 },
        commissions: {
          totalDistributed: 15000.0,
          level1Total: 12150.0,
          level2Total: 1350.0,
          superAdminTotal: 1500.0,
        },
        ordersWithReferral: 50,
        topReferrers: [],
      },
    },
  })
  getReferralStats() {
    return this.adminService.getReferralStats();
  }

  @Get('referral-users')
  @ApiOperation({
    summary: 'Get all users with referral info (Super Admin)',
    description:
      'Returns paginated list of users with their referral codes, counts, and earnings',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'List of users with referral information',
  })
  getReferralUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getReferralUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('referral-commissions')
  @ApiOperation({
    summary: 'Get referral commissions history (Super Admin)',
    description:
      'Returns paginated list of orders with commission breakdown (Level1, Level2, SuperAdmin)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Commission history from orders',
  })
  getReferralCommissions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getReferralCommissions(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('referral-users/:userId')
  @ApiOperation({
    summary: 'Get detailed referral info for a specific user (Super Admin)',
    description:
      'Returns user referral details, referred users list, and earnings history',
  })
  @ApiResponse({
    status: 200,
    description: 'User referral details',
  })
  getUserReferralDetails(@Param('userId') userId: string) {
    return this.adminService.getUserReferralDetails(userId);
  }
}
