import { IsString, IsNotEmpty, IsEmail, MinLength, IsEnum } from 'class-validator';
import { UserRole } from 'src/users/entities/user.entity';

export class registrationDto {
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;
  
    @IsEmail()
    email: string;
  
    @IsNotEmpty()
    @MinLength(8)
    password: string;

    @IsEnum(UserRole)
    role: UserRole;
}
 