import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';

@Injectable()
export class TaskOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const taskId = request.params.id;
    const userId = request.user.id;

    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['createdBy', 'assignedUsers'],
    });

    if (!task) {
      return false;
    }

    // Allow if user is the creator or is assigned to the task
    const isCreator = task.createdBy.id === userId;
    const isAssigned = task.assignedUsers.some(user => user.id === userId);

    if (!isCreator && !isAssigned) {
      throw new ForbiddenException('You do not have permission to modify this task');
    }

    return true;
  }
} 