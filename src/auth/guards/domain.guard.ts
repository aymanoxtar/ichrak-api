import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CHECK_DOMAIN_KEY } from '../decorators/check-domain.decorator';
import { Role } from '../../common/enums';
import { User } from '../../users/entities/user.entity';

interface RequestWithUser extends Request {
  user: User;
  params: { domainId?: string };
  body: { domainId?: string };
}

@Injectable()
export class DomainGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const checkDomain = this.reflector.getAllAndOverride<boolean>(
      CHECK_DOMAIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!checkDomain) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const params = request.params;
    const body = request.body;

    // Super Admin can access everything
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Admin can only access resources in their domain
    if (user.role === Role.ADMIN) {
      // Check if user has a domain
      if (!user.domainId) {
        throw new ForbiddenException('Admin must be assigned to a domain');
      }

      // If domainId is in params or body, verify it matches user's domain
      const resourceDomainId = params.domainId || body.domainId;

      if (resourceDomainId && resourceDomainId !== user.domainId) {
        throw new ForbiddenException('Access denied: Domain mismatch');
      }

      return true;
    }

    return true;
  }
}
