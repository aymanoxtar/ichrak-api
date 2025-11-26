import { PartialType } from '@nestjs/mapped-types';
import { CreateGlobalProductDto } from './create-global-product.dto';

export class UpdateGlobalProductDto extends PartialType(
  CreateGlobalProductDto,
) {}
