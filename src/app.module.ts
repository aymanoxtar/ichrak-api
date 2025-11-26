import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DomainsModule } from './domains/domains.module';
import { CategoriesModule } from './categories/categories.module';
import { ServicesModule } from './services/services.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { GlobalProductsModule } from './global-products/global-products.module';
import { AdminProductsModule } from './admin-products/admin-products.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { LocationsModule } from './locations/locations.module';
import { PreCalculatedModule } from './pre-calculated/pre-calculated.module';
import { OrdersModule } from './orders/orders.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate Limiting: 100 requests per minute globally
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        // If DATABASE_URL exists, use it (Supabase style)
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true, // Set to false in production
            logging: true, // Enable logging to see connection status
            ssl: {
              rejectUnauthorized: false, // Required for Supabase
            },
          };
        }

        // Otherwise use individual config values
        return {
          type: 'postgres',
          host: configService.get<string>('DATABASE_HOST'),
          port: configService.get<number>('DATABASE_PORT'),
          username: configService.get<string>('DATABASE_USER'),
          password: configService.get<string>('DATABASE_PASSWORD'),
          database: configService.get<string>('DATABASE_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true, // Set to false in production
          logging: true,
          ssl: {
            rejectUnauthorized: false, // Required for Supabase
          },
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    DomainsModule,
    CategoriesModule,
    ServicesModule,
    ProductCategoriesModule,
    GlobalProductsModule,
    AdminProductsModule,
    PromoCodesModule,
    LocationsModule,
    PreCalculatedModule,
    OrdersModule,
    CartModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
