import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Task } from '../task/entities/task.entity';
import { Project } from '../project/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.entity';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private mailerService: MailerService,
  ) {}

  async getTaskCompletionRatePerUser() {
    try {
      const users = await this.userRepository.find();
      const completionRates = await Promise.all(
        users.map(async (user) => {
          const totalTasks = await this.taskRepository.count({
            where: { assignedTo: { id: user.id } },
          });

          const completedTasks = await this.taskRepository.count({
            where: {
              assignedTo: { id: user.id },
              status: 'COMPLETED',
            },
          });

          const completionRate = totalTasks > 0 
            ? (completedTasks / totalTasks) * 100 
            : 0;

          return {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            totalTasks,
            completedTasks,
            completionRate: completionRate.toFixed(2) + '%',
          };
        }),
      );

      return completionRates;
    } catch (error) {
      this.logger.error('Error getting task completion rates:', error);
      throw error;
    }
  }

  async getPendingTasksPerProject() {
    try {
      const projects = await this.projectRepository.find();
      const pendingTasks = await Promise.all(
        projects.map(async (project) => {
          const pendingCount = await this.taskRepository.count({
            where: {
              project: { id: project.id },
              status: 'PENDING',
            },
          });

          return {
            projectId: project.id,
            projectTitle: project.title,
            pendingTasksCount: pendingCount,
          };
        }),
      );

      return pendingTasks;
    } catch (error) {
      this.logger.error('Error getting pending tasks:', error);
      throw error;
    }
  }

  async sendDailySummaryToAdmins() {
    try {
      const admins = await this.userRepository.find({
        where: { role: UserRole.ADMIN },
      });

      if (admins.length === 0) {
        this.logger.warn('No admin users found to send daily summary');
        return {
          message: 'No admin users found',
          recipients: [],
        };
      }

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get yesterday's statistics
      const newTasks = await this.taskRepository.count({
        where: {
          createdAt: Between(yesterday, today),
        },
      });

      const completedTasks = await this.taskRepository.count({
        where: {
          updatedAt: Between(yesterday, today),
          status: 'COMPLETED',
        },
      });

      const newProjects = await this.projectRepository.count({
        where: {
          createdAt: Between(yesterday, today),
        },
      });

      const completionRates = await this.getTaskCompletionRatePerUser();
      const pendingTasks = await this.getPendingTasksPerProject();

      // Send email to each admin
      const emailPromises = admins.map(async (admin) => {
        try {
          await this.mailerService.sendMail({
            to: admin.email,
            subject: 'Daily Task Management Summary',
            template: 'daily-summary',
            context: {
              adminName: `${admin.firstName} ${admin.lastName}`,
              date: yesterday.toLocaleDateString(),
              newTasks,
              completedTasks,
              newProjects,
              completionRates,
              pendingTasks,
            },
          });
          this.logger.log(`Daily summary sent to admin: ${admin.email}`);
          return admin.email;
        } catch (error) {
          this.logger.error(`Failed to send email to admin ${admin.email}:`, error);
          return null;
        }
      });

      const results = await Promise.all(emailPromises);
      const successfulRecipients = results.filter(email => email !== null);

      return {
        message: 'Daily summary sent to admins',
        recipients: successfulRecipients,
        totalAdmins: admins.length,
        successfulSends: successfulRecipients.length,
      };
    } catch (error) {
      this.logger.error('Error sending daily summary:', error);
      throw error;
    }
  }
} 