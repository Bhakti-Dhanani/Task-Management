import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Ensure role is properly set and is a valid UserRole
    if (!payload.role || !Object.values(UserRole).includes(payload.role)) {
      throw new Error('Invalid user role in token');
    }

    return { 
      id: payload.sub, 
      email: payload.email, 
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName
    };
  }
} 