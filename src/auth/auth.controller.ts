import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { registrationDto } from './dto/registrationDto';
import { loginDto } from './dto/loginDto';
import { User } from 'src/users/entities/user.entity';

@Controller('auth')
export class AuthController {
    constructor(
        private authSercice:AuthService
    ){}
    
    @Post('register')
    registration(@Body()userdto:registrationDto ):Promise<{ message: string }>{
        return this.authSercice.registration(userdto);
 }
     @Post('login')
     login(@Body() userdto:loginDto):Promise<{user:User; token:string}>{
        return this.authSercice.login(userdto);

 }   
}
