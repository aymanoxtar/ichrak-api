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
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { User } from '../users/entities/user.entity';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({ status: 201, description: 'Service created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ARTISAN, ADMIN, or SUPER_ADMIN role' })
  create(
    @Body() createServiceDto: CreateServiceDto,
    @CurrentUser() user: User,
  ) {
    return this.servicesService.create(createServiceDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all services or filter by artisan/category' })
  @ApiQuery({ name: 'artisanId', required: false, description: 'Filter by artisan ID' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category ID' })
  @ApiResponse({ status: 200, description: 'List of services' })
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
  @ApiOperation({ summary: 'Get a service by ID' })
  @ApiResponse({ status: 200, description: 'Service found' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a service' })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only update own services' })
  @ApiResponse({ status: 404, description: 'Service not found' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle service availability' })
  @ApiResponse({ status: 200, description: 'Availability toggled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only toggle own services' })
  toggleAvailability(@Param('id') id: string, @CurrentUser() user: User) {
    return this.servicesService.toggleAvailability(id, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ARTISAN, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a service' })
  @ApiResponse({ status: 200, description: 'Service deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only delete own services' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.servicesService.remove(id, user);
  }
}
