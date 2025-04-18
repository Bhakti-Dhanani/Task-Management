import { Controller, Get, Patch, Param, UseGuards, Req, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { NotificationService } from '../notification.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';

interface RequestWithUser extends Request {
  user: User;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getUserNotifications(@Req() req: RequestWithUser) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.notificationService.getUserNotifications(req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    const notificationId = parseInt(id, 10);
    if (isNaN(notificationId)) {
      throw new BadRequestException('Invalid notification ID');
    }
    return this.notificationService.markAsRead(notificationId, req.user.id);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: RequestWithUser) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.notificationService.markAllAsRead(req.user.id);
  }
} 