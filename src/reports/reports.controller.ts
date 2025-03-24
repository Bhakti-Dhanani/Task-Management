import { Controller, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('task-completion')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getTaskCompletionRate() {
    try {
      return await this.reportsService.getTaskCompletionRatePerUser();
    } catch (error) {
      throw new HttpException(
        'Failed to get task completion rates',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('pending-tasks')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getPendingTasks() {
    try {
      return await this.reportsService.getPendingTasksPerProject();
    } catch (error) {
      throw new HttpException(
        'Failed to get pending tasks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('send-daily-summary')
  @Roles(UserRole.ADMIN)
  async sendDailySummary() {
    try {
      return await this.reportsService.sendDailySummaryToAdmins();
    } catch (error) {
      throw new HttpException(
        'Failed to send daily summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 