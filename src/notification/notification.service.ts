import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Task } from '../task/entities/task.entity';
import { Project } from '../project/entities/project.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private eventEmitter: EventEmitter2,
    private mailerService: MailerService,
    private jwtService: JwtService,
  ) {}

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async createTaskAssignedNotification(task: Task, assignedUser: User) {
    const notification = this.notificationRepository.create({
      title: 'New Task Assigned',
      message: `You have been assigned to task: ${task.title}`,
      type: NotificationType.TASK_ASSIGNED,
      recipient: assignedUser,
      task: task,
    });

    await this.notificationRepository.save(notification);
    this.eventEmitter.emit('notification.created', notification);

    // Send email notification
    await this.mailerService.sendMail({
      to: assignedUser.email,
      subject: 'New Task Assigned',
      template: 'task-assigned',
      context: {
        taskTitle: task.title,
        taskDescription: task.description,
        dueDate: task.dueDate,
      },
    });
  }

  async createTaskCompletedNotification(task: Task) {
    const project = await task.project;
    const manager = await project.assignedManager;

    const notification = this.notificationRepository.create({
      title: 'Task Completed',
      message: `Task "${task.title}" has been completed`,
      type: NotificationType.TASK_COMPLETED,
      recipient: manager,
      task: task,
    });

    await this.notificationRepository.save(notification);
    this.eventEmitter.emit('notification.created', notification);

    // Send email notification to manager
    await this.mailerService.sendMail({
      to: manager.email,
      subject: 'Task Completed',
      template: 'task-completed',
      context: {
        taskTitle: task.title,
        projectTitle: project.title,
      },
    });
  }

  async createProjectCompletedNotification(project: Project) {
    const admin = await this.userRepository.findOne({ where: { role: UserRole.ADMIN } });
    if (!admin) return;

    const notification = this.notificationRepository.create({
      title: 'Project Completed',
      message: `Project "${project.title}" has been completed`,
      type: NotificationType.PROJECT_COMPLETED,
      recipient: admin,
      project: project,
    });

    await this.notificationRepository.save(notification);
    this.eventEmitter.emit('notification.created', notification);

    // Send email notification to admin
    await this.mailerService.sendMail({
      to: admin.email,
      subject: 'Project Completed',
      template: 'project-completed',
      context: {
        projectTitle: project.title,
        projectDescription: project.description,
      },
    });
  }

  async getUserNotifications(userId: number) {
    return this.notificationRepository.find({
      where: { recipient: { id: userId } },
      relations: ['task', 'project'],
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: number, userId: number) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, recipient: { id: userId } },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    await this.notificationRepository.save(notification);
    return notification;
  }

  async markAllAsRead(userId: number) {
    await this.notificationRepository.update(
      { recipient: { id: userId }, isRead: false },
      { isRead: true },
    );
  }
} 