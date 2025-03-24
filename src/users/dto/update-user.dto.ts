import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateRoleDto {
  @IsNotEmpty()
  @IsEnum(UserRole, { message: 'Invalid role provided' })
  role: UserRole;
}
