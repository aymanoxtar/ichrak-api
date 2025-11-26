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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { UsePromoCodeDto } from './dto/use-promo-code.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { User } from '../users/entities/user.entity';

@ApiTags('Promo Codes')
@ApiBearerAuth('JWT-auth')
@Controller('promo-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createDto: CreatePromoCodeDto, @CurrentUser() admin: User) {
    return this.promoCodesService.create(createDto, admin);
  }

  @Post('assign')
  @Roles(Role.CLIENT, Role.ARTISAN)
  assignToMe(
    @Body('code') code: string,
    @Body('referredBy') referredBy: string,
    @CurrentUser() user: User,
  ) {
    return this.promoCodesService.assignToUser(code, user.id, referredBy);
  }

  @Post('use')
  @Roles(Role.CLIENT, Role.ARTISAN)
  use(@Body() useDto: UsePromoCodeDto, @CurrentUser() user: User) {
    return this.promoCodesService.usePromoCode(useDto, user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findAll(@Query('adminId') adminId?: string) {
    if (adminId) {
      return this.promoCodesService.findByAdmin(adminId);
    }
    return this.promoCodesService.findAll();
  }

  @Get('my-codes')
  @Roles(Role.ADMIN)
  getMyPromoCodes(@CurrentUser() admin: User) {
    return this.promoCodesService.findByAdmin(admin.id);
  }

  @Get('my-promo-codes')
  @Roles(Role.CLIENT, Role.ARTISAN)
  getMyAssignedCodes(@CurrentUser() user: User) {
    return this.promoCodesService.findByUser(user.id);
  }

  @Get('my-earnings')
  @Roles(Role.CLIENT, Role.ARTISAN)
  getMyEarnings(@CurrentUser() user: User) {
    return this.promoCodesService.getReferralEarnings(user.id);
  }

  @Get('usage-history')
  getUsageHistory(
    @Query('userId') userId?: string,
    @Query('promoCodeId') promoCodeId?: string,
  ) {
    return this.promoCodesService.getUsageHistory(userId, promoCodeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promoCodesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateDto: UpdatePromoCodeDto) {
    return this.promoCodesService.update(id, updateDto);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  toggleActive(@Param('id') id: string) {
    return this.promoCodesService.toggleActive(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.promoCodesService.remove(id);
  }
}
