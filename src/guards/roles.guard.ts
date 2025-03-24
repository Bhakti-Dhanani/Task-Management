import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ROLES_KEY } from 'src/decorators/roles.decorator';
import { UserRole } from 'src/users/entities/user.entity';

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
      return true; // No role restriction, allow access
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authentication token provided. Please include a Bearer token in the Authorization header.');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload; // Attach user to request

      if (!payload.role) {
        throw new ForbiddenException('User role not found in token');
      }

      if (!requiredRoles.includes(payload.role)) {
        throw new ForbiddenException(`Access denied. Required role: ${requiredRoles.join(', ')}. Your role: ${payload.role}`);
      }

      return true; // Grant access
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired. Please log in again.');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token. Please log in again.');
      }
      throw new UnauthorizedException('Authentication failed. Please log in again.');
    }
  }
}
