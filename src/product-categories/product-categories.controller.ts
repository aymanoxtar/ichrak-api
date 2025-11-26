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
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Product Categories')
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly categoriesService: ProductCategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create product category (SuperAdmin)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  create(@Body() createDto: CreateProductCategoryDto) {
    return this.categoriesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({ name: 'view', required: false, enum: ['tree', 'root'] })
  @ApiResponse({ status: 200, description: 'Returns categories list' })
  findAll(@Query('view') view?: string) {
    if (view === 'tree') {
      return this.categoriesService.findTree();
    }
    if (view === 'root') {
      return this.categoriesService.findRootCategories();
    }
    return this.categoriesService.findAll();
  }

  @Get('by-parent/:parentId')
  @ApiOperation({ summary: 'Get subcategories by parent ID' })
  @ApiResponse({ status: 200, description: 'Returns child categories' })
  findByParent(@Param('parentId') parentId: string) {
    return this.categoriesService.findByParent(parentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Returns category' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Get(':id/path')
  @ApiOperation({ summary: 'Get category path (breadcrumb)' })
  @ApiResponse({
    status: 200,
    description: 'Returns path from root to category',
  })
  getPath(@Param('id') id: string) {
    return this.categoriesService.getPath(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update category (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  update(@Param('id') id: string, @Body() updateDto: UpdateProductCategoryDto) {
    return this.categoriesService.update(id, updateDto);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle category active status (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Status toggled' })
  toggleActive(@Param('id') id: string) {
    return this.categoriesService.toggleActive(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete category (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Get(':categoryId/admins')
  @ApiOperation({
    summary: 'Get admins in common category (sorted by distance)',
  })
  @ApiQuery({ name: 'latitude', required: true })
  @ApiQuery({ name: 'longitude', required: true })
  @ApiQuery({ name: 'domainId', required: false })
  @ApiResponse({ status: 200, description: 'Returns list of admins' })
  @ApiResponse({ status: 400, description: 'Category is not marked as common' })
  getAdminsByCategory(
    @Param('categoryId') categoryId: string,
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('domainId') domainId?: string,
  ) {
    return this.categoriesService.getAdminsByCategory(
      categoryId,
      parseFloat(latitude),
      parseFloat(longitude),
      domainId,
    );
  }

  @Get('admins/:adminId/:categoryId/products')
  @ApiOperation({ summary: 'Get products by admin in category' })
  @ApiResponse({
    status: 200,
    description: 'Returns admin products in category',
  })
  getProductsByAdminAndCategory(
    @Param('adminId') adminId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.getProductsByAdminAndCategory(
      adminId,
      categoryId,
    );
  }
}
