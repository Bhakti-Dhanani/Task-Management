import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<number, Socket> = new Map();

  constructor(private readonly notificationService: NotificationService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.notificationService.validateToken(token);
      this.userSockets.set(payload.id, client);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socket] of this.userSockets.entries()) {
      if (socket === client) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('join')
  async handleJoin(client: Socket, userId: number) {
    this.userSockets.set(userId, client);
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(client: Socket, payload: { notificationId: number; userId: number }) {
    await this.notificationService.markAsRead(payload.notificationId, payload.userId);
  }

  @SubscribeMessage('markAllAsRead')
  async handleMarkAllAsRead(client: Socket, userId: number) {
    await this.notificationService.markAllAsRead(userId);
  }

  sendNotificationToUser(userId: number, notification: Notification) {
    const socket = this.userSockets.get(userId);
    if (socket) {
      socket.emit('notification', notification);
    }
  }
} 