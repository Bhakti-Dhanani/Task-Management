import { Injectable, CanActivate, ExecutionContext, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class TaskOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const taskId = parseInt(request.params.id, 10);

    if (!userId || isNaN(taskId)) {
      throw new ForbiddenException('Invalid request parameters');
    }

    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['createdBy', 'assignedUsers'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!task.createdBy) {
      throw new ForbiddenException('Task has no creator assigned');
    }

    const isCreator = task.createdBy.id === userId;
    const isAssigned = task.assignedUsers?.some(user => user.id === userId) ?? false;

    if (!isCreator && !isAssigned) {
      throw new ForbiddenException('You do not have permission to access this task');
    }

    return true;
  }
} 