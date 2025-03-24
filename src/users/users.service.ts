import { Injectable,ForbiddenException,NotFoundException} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import {UpdateRoleDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ){}
  async findAllUsers(page: number = 1, limit: number = 10): Promise<{ users: Partial<User>[], total: number }> {
    const [users, total] = await this.userRepository.findAndCount({
      select: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt', 'updatedAt'],
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: 'DESC'
      }
    });

    return {
      users,
      total
    };
  }

  async changeUserRole(adminId: number, userId: number, updateRoleDto: UpdateRoleDto): Promise<User> {
    const admin = await this.userRepository.findOne({ where: { id: adminId } });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Admins can change roles');
    }

    if (adminId === userId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = updateRoleDto.role;
    return this.userRepository.save(user);
  }
}