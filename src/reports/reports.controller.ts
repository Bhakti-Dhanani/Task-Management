import { Controller, Get, Post, UseGuards, HttpException, HttpStatus, Req, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, User } from '../users/entities/user.entity';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: User;
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('task-completion')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getTaskCompletionRatePerUser() {
    return this.reportsService.getTaskCompletionRatePerUser();
  }

  @Get('pending-tasks')
  @UseGuards(RolesGuard)
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

  @Get('daily-summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getDailySummary() {
    try {
      return await this.reportsService.getDailySummary();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('task-completion-rate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getTaskCompletionRate() {
    try {
      return await this.reportsService.getTaskCompletionRate();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('send-daily-summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async sendDailySummary() {
    try {
      const result = await this.reportsService.sendDailySummaryToAdmins();
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('send-user-report')
  @UseGuards(RolesGuard)
  @Roles(UserRole.USER, UserRole.MANAGER)
  async sendUserReport(@Req() req: RequestWithUser) {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedException('User not authenticated');
      }
      const userId = req.user.id;
      const result = await this.reportsService.generateAndSendUserReport(userId);
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
} 