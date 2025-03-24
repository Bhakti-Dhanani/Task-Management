import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
    ) {}

    async register(registerDto: RegisterDto): Promise<{ message: string }> {
        const existingUser = await this.userRepository.findOne({
            where: { email: registerDto.email },
        });

        if (existingUser) {
            throw new BadRequestException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        const user = this.userRepository.create({
            ...registerDto,
            password: hashedPassword,
        });

        await this.userRepository.save(user);

        return { message: 'User registered successfully' };
    }

    async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
        const user = await this.userRepository.findOne({
            where: { email: loginDto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = { 
            sub: user.id, 
            email: user.email, 
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName
        };
        const token = this.jwtService.sign(payload);

        return { user, token };
    }
}
