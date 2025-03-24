import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token);
      
      // Validate role exists and is valid
      if (!payload.role || !Object.values(UserRole).includes(payload.role)) {
        throw new ForbiddenException('Invalid user role in token');
      }

      // Attach user to request
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        firstName: payload.firstName,
        lastName: payload.lastName
      };

      // Check if user has required role
      if (!requiredRoles.includes(payload.role)) {
        throw new ForbiddenException(
          `Access denied. Required role: ${requiredRoles.join(', ')}. Your role: ${payload.role}`
        );
      }

      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired. Please log in again.');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token. Please log in again.');
      }
      throw error;
    }
  }
}
