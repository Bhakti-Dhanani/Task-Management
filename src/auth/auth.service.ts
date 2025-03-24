import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import {JwtService}from '@nestjs/jwt'
import {ConfigService } from '@nestjs/config'
import { registrationDto } from './dto/registrationDto';
import * as bcrypt from 'bcrypt';
import { loginDto } from './dto/loginDto';




@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
private readonly userRepository:Repository<User>,
private jwtService:JwtService,
private  configService:ConfigService,

    ){}

public async registration(userdto:registrationDto):Promise<{ message: string }>{
    // find fot the email already exist or not 
 const user = await this.userRepository.findOne({
    where:{email:userdto.email},
 });
 if(user){
    throw new BadRequestException('user already exist');
 }
 // create user

 const hashedPassword = await bcrypt.hash(userdto.password, 10);
 userdto.password = hashedPassword;

 const newuser = this.userRepository.create(userdto);
 await this.userRepository.save(newuser);
 return { message: 'User created successfully' };
}
public async login(userdto:loginDto):Promise<
 {
    user: User;
    token: string;
 }>{
    //check for the email
    const checkEmail = await this.userRepository.count({
        where:{email:userdto.email},
        select: ['id', 'email', 'firstName','lastName', 'password', 'role'],
    })
    if(checkEmail === 0){
        throw new BadRequestException('invalid email credential');
    }
    //find from the  for the password
    const user = await this.userRepository.findOne({
        where: { email: userdto.email },
        select: ['id', 'email', 'firstName', 'lastName', 'password', 'role'], 
      });
      if (!user) {
        throw new BadRequestException('User not found'); 
      }
      const isPasswordValid = await bcrypt.compare(userdto.password, user.password);
      if (!isPasswordValid) {
        throw new BadRequestException('Invalid password credentials');
      }
      const expiresIn = this.configService.get<string>('jwt.expiresIn') || '1h';
      const token = this.jwtService.sign(
        { id: user.id, email: user.email, role: user.role },
        {
          secret: this.configService.get<string>('jwt.secret'),
          expiresIn
          
        },
      );
    
      return { user, token };
    
 }

}
