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
import { AdminProductsService } from './admin-products.service';
import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { User } from '../users/entities/user.entity';

@ApiTags('Admin Products')
@ApiBearerAuth('JWT-auth')
@Controller('admin-products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createDto: CreateAdminProductDto, @CurrentUser() admin: User) {
    return this.adminProductsService.create(createDto, admin);
  }

  @Get()
  findAll(
    @Query('adminId') adminId?: string,
    @Query('domainId') domainId?: string,
  ) {
    if (adminId) {
      return this.adminProductsService.findByAdmin(adminId);
    }
    if (domainId) {
      return this.adminProductsService.findByDomain(domainId);
    }
    return this.adminProductsService.findAll();
  }

  @Get('my-products')
  @Roles(Role.ADMIN)
  getMyProducts(@CurrentUser() admin: User) {
    return this.adminProductsService.findByAdmin(admin.id);
  }

  @Get('available-global-products')
  @Roles(Role.ADMIN)
  getAvailableGlobalProducts(@CurrentUser() admin: User) {
    return this.adminProductsService.getAvailableGlobalProducts(admin.id);
  }

  @Get('search')
  search(@Query('q') query: string, @Query('domainId') domainId?: string) {
    return this.adminProductsService.search(query, domainId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminProductsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAdminProductDto,
    @CurrentUser() user: User,
  ) {
    return this.adminProductsService.update(id, updateDto, user);
  }

  @Patch(':id/toggle-availability')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  toggleAvailability(@Param('id') id: string, @CurrentUser() user: User) {
    return this.adminProductsService.toggleAvailability(id, user);
  }

  @Patch(':id/quantity')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateQuantity(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @CurrentUser() user: User,
  ) {
    return this.adminProductsService.updateQuantity(id, quantity, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.adminProductsService.remove(id, user);
  }
}
