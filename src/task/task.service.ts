import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { User } from '../users/entities/user.entity';
import { Project } from '../project/entities/project.entity';
import { UserRole } from '../users/entities/user.entity';
import { TaskStatus } from './entities/task.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private notificationService: NotificationService,
  ) {}

  private async checkOverlappingTasks(userId: number, dueDate: Date): Promise<void> {
    const existingTasks = await this.taskRepository
      .createQueryBuilder('task')
      .innerJoin('task.assignedUsers', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('task.status != :completedStatus', { completedStatus: 'completed' })
      .getMany();

    const hasOverlap = existingTasks.some(task => {
      const taskDueDate = new Date(task.dueDate);
      const newDueDate = new Date(dueDate);
      return Math.abs(taskDueDate.getTime() - newDueDate.getTime()) < 24 * 60 * 60 * 1000; // 24 hours
    });

    if (hasOverlap) {
      throw new BadRequestException('User already has a task due within 24 hours of this task');
    }
  }

  private async validateManager(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ 
      where: { 
        id: userId,
        role: UserRole.MANAGER 
      }
    });

    if (!user) {
      throw new ForbiddenException('Only managers can create tasks');
    }

    return user;
  }

  private async validateTaskAccess(task: Task, userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ 
      where: { id: userId }
    });
    
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Allow access if user is a manager
    if (user.role === UserRole.MANAGER) {
      return;
    }

    // For non-managers, check if they are assigned to the task
    const isAssigned = task.assignedUsers.some(assignedUser => assignedUser.id === userId);
    if (!isAssigned) {
      throw new ForbiddenException('You do not have permission to modify this task');
    }
  }

  async create(createTaskDto: CreateTaskDto, creatorId: number) {
    const project = await this.projectRepository.findOne({
      where: { id: createTaskDto.projectId },
      relations: ['assignedManager'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate that the creator is a manager
    const creator = await this.validateManager(creatorId);

    // Create assigned users array
    const assignedUsers = await Promise.all(
      createTaskDto.assignedUserIds.map(userId =>
        this.userRepository.findOne({ where: { id: userId } })
      )
    );

    // Filter out any null values (users not found)
    const validAssignedUsers = assignedUsers.filter(user => user !== null);

    if (validAssignedUsers.length === 0) {
      throw new BadRequestException('No valid assigned users provided');
    }

    // Check for overlapping tasks for each assigned user
    await Promise.all(
      validAssignedUsers.map(user => 
        this.checkOverlappingTasks(user.id, createTaskDto.dueDate)
      )
    );

    const task = this.taskRepository.create({
      title: createTaskDto.title,
      description: createTaskDto.description,
      dueDate: createTaskDto.dueDate,
      status: createTaskDto.status || TaskStatus.PENDING,
      project,
      createdBy: creator,
      assignedUsers: validAssignedUsers
    });

    const savedTask = await this.taskRepository.save(task);

    // Send notifications to assigned users
    for (const user of validAssignedUsers) {
      await this.notificationService.createTaskAssignedNotification(savedTask, user);
    }

    return savedTask;
  }

  async findAll(): Promise<Task[]> {
    return this.taskRepository.find({
      relations: ['project', 'createdBy', 'assignedUsers'],
    });
  }

  async findOne(id: number): Promise<Task> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id },
        relations: {
          project: true,
          createdBy: true,
          assignedUsers: true
        },
      });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      return task;
    } catch (error) {
      console.error('Error in findOne:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Error retrieving task: ${error.message}`);
    }
  }

  async update(id: number, updateTaskDto: UpdateTaskDto, userId: number) {
    try {
      const task = await this.taskRepository.findOne({
        where: { id },
        relations: ['project', 'project.assignedManager', 'assignedUsers'],
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      // Validate user access
      await this.validateTaskAccess(task, userId);

      // Update project if provided
      if (updateTaskDto.projectId) {
        const project = await this.projectRepository.findOne({
          where: { id: updateTaskDto.projectId },
          relations: ['assignedManager'],
        });

        if (!project) {
          throw new NotFoundException('Project not found');
        }

        task.project = project;
      }

      // Handle assigned users update
      if (updateTaskDto.assignedUserIds) {
        const newAssignedUsers = await Promise.all(
          updateTaskDto.assignedUserIds.map(userId => 
            this.userRepository.findOne({ where: { id: userId } })
          )
        );

        const validNewUsers = newAssignedUsers.filter(user => user !== null);

        if (validNewUsers.length === 0) {
          throw new BadRequestException('No valid assigned users provided');
        }

        // Check for overlapping tasks for new users
        await Promise.all(
          validNewUsers.map(user => 
            this.checkOverlappingTasks(user.id, updateTaskDto.dueDate || task.dueDate)
          )
        );

        // Send notifications to newly assigned users
        const newUsers = validNewUsers.filter(
          newUser => !task.assignedUsers.some(existingUser => existingUser.id === newUser.id)
        );

        for (const user of newUsers) {
          await this.notificationService.createTaskAssignedNotification(task, user);
        }

        task.assignedUsers = validNewUsers;
      }

      // Check if task status is being updated to completed
      if (updateTaskDto.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
        await this.notificationService.createTaskCompletedNotification(task);
      }

      // Update other fields
      if (updateTaskDto.title) task.title = updateTaskDto.title;
      if (updateTaskDto.description) task.description = updateTaskDto.description;
      if (updateTaskDto.dueDate) task.dueDate = updateTaskDto.dueDate;
      if (updateTaskDto.status) task.status = updateTaskDto.status;

      const updatedTask = await this.taskRepository.save(task);
      return updatedTask;
    } catch (error) {
      console.error('Error in update:', error);
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update task: ${error.message}`);
    }
  }

  async remove(id: number, userId: number): Promise<void> {
    const task = await this.findOne(id);
    await this.validateTaskAccess(task, userId);
    await this.taskRepository.remove(task);
  }
}
