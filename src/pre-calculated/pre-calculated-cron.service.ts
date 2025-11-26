import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PreCalculatedService } from './pre-calculated.service';

@Injectable()
export class PreCalculatedCronService {
  private readonly logger = new Logger(PreCalculatedCronService.name);

  constructor(private readonly preCalculatedService: PreCalculatedService) {}

  /**
   * Cron Job: كل ليلة في 3:00 صباحاً
   * كيحسب العروض لجميع المنتجات في جميع الـ Locations
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handlePreCalculation() {
    this.logger.log('🚀 Starting pre-calculation job...');

    try {
      const result = await this.preCalculatedService.preCalculateAll();
      this.logger.log(
        `✅ Pre-calculation completed: ${result.count} entries calculated`,
      );
    } catch (error) {
      this.logger.error('❌ Pre-calculation failed:', error);
    }
  }

  /**
   * Cron Job: كل ليلة في 3:30 صباحاً
   * كيحسب Admins القريبين لكل Location
   */
  @Cron('30 3 * * *') // 3:30 AM
  async handleAdminsPreCalculation() {
    this.logger.log('🚀 Starting admins pre-calculation job...');

    try {
      const result = await this.preCalculatedService.preCalculateAdmins();
      this.logger.log(
        `✅ Admins pre-calculation completed: ${result.locationsCount} locations processed`,
      );
    } catch (error) {
      this.logger.error('❌ Admins pre-calculation failed:', error);
    }
  }

  /**
   * Cron Job: كل ليلة في 4:00 صباحاً
   * كيحسب Common Products لكل Location + Category
   * (للـ LiteSQL)
   */
  @Cron('0 4 * * *') // 4:00 AM
  async handleCommonProductsPreCalculation() {
    this.logger.log('🚀 Starting common products pre-calculation job...');

    try {
      const result =
        await this.preCalculatedService.preCalculateCommonProducts();
      this.logger.log(
        `✅ Common products pre-calculation completed: ${result.locationsCount} locations, ${result.categoriesCount} categories`,
      );
    } catch (error) {
      this.logger.error('❌ Common products pre-calculation failed:', error);
    }
  }
}
