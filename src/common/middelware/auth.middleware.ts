import { Injectable, NestMiddleware } from '@nestjs/common';
import {JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

declare global {
  namespace Express {
    interface Request {
      user?: User | null;
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
constructor(
 private jwtservice:JwtService,
 @InjectRepository(User)
 private readonly userrepository:Repository<User>
){}

async use(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null; // No token provided
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify JWT
    const decoded = this.jwtservice.verify(token);

    // Fetch user from DB
    const user = await this.userrepository.findOne({
      where: { id: decoded.id },
    });
    req.user = user || null;
  } catch (error) {
    // Token expired or invalid
    // req.user = null;
    return res
      .status(401)
      .json({ message: 'Token expired. Please log in again.' });
  }

  next();
}
}