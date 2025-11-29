import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Service } from '../services/entities/service.entity';
import { Domain } from '../domains/entities/domain.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Service, Domain])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
