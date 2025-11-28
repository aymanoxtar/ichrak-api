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
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { User } from '../users/entities/user.entity';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN, Role.SUPER_ADMIN)
  create(
    @Body() createServiceDto: CreateServiceDto,
    @CurrentUser() user: User,
  ) {
    return this.servicesService.create(createServiceDto, user);
  }

  @Get()
  findAll(
    @Query('artisanId') artisanId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    if (artisanId) {
      return this.servicesService.findByArtisan(artisanId);
    }
    if (categoryId) {
      return this.servicesService.findByCategory(categoryId);
    }
    return this.servicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @CurrentUser() user: User,
  ) {
    return this.servicesService.update(id, updateServiceDto, user);
  }

  @Patch(':id/toggle-availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN, Role.SUPER_ADMIN)
  toggleAvailability(@Param('id') id: string, @CurrentUser() user: User) {
    return this.servicesService.toggleAvailability(id, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.servicesService.remove(id, user);
  }
}
