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

// Service = Template created by Super Admin (no price, no artisan)
@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a service template (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Service template created' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires SUPER_ADMIN role',
  })
  create(
    @Body() createServiceDto: CreateServiceDto,
    @CurrentUser() user: User,
  ) {
    return this.servicesService.create(createServiceDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all active service templates or filter by category',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiResponse({ status: 200, description: 'List of service templates' })
  findAll(@Query('categoryId') categoryId?: string) {
    if (categoryId) {
      return this.servicesService.findByCategory(categoryId);
    }
    return this.servicesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service template by ID' })
  @ApiResponse({ status: 200, description: 'Service template found' })
  @ApiResponse({ status: 404, description: 'Service template not found' })
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a service template (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Service template updated' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires SUPER_ADMIN role',
  })
  update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @CurrentUser() user: User,
  ) {
    return this.servicesService.update(id, updateServiceDto, user);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Toggle service template active status (Super Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Active status toggled' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires SUPER_ADMIN role',
  })
  toggleActive(@Param('id') id: string, @CurrentUser() user: User) {
    return this.servicesService.toggleActive(id, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a service template (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Service template deleted' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires SUPER_ADMIN role',
  })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.servicesService.remove(id, user);
  }
}
