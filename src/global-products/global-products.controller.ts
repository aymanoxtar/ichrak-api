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
import { ApiTags } from '@nestjs/swagger';
import { GlobalProductsService } from './global-products.service';
import { CreateGlobalProductDto } from './dto/create-global-product.dto';
import { UpdateGlobalProductDto } from './dto/update-global-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('Global Products')
@Controller('global-products')
export class GlobalProductsController {
  constructor(private readonly productsService: GlobalProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createDto: CreateGlobalProductDto) {
    return this.productsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('search')
  search(@Query() searchDto: SearchProductDto) {
    return this.productsService.search(searchDto);
  }

  @Get('most-viewed')
  getMostViewed(@Query('limit') limit?: number) {
    return this.productsService.getMostViewed(limit ? +limit : 10);
  }

  @Get('latest')
  getLatest(@Query('limit') limit?: number) {
    return this.productsService.getLatest(limit ? +limit : 10);
  }

  @Get('by-category/:categoryId')
  findByCategory(@Param('categoryId') categoryId: string) {
    return this.productsService.findByCategory(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateDto: UpdateGlobalProductDto) {
    return this.productsService.update(id, updateDto);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  toggleActive(@Param('id') id: string) {
    return this.productsService.toggleActive(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
