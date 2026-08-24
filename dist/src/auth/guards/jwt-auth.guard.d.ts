import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
export interface RequestUser {
    id: string;
    login: string;
    twoFaEnabled: boolean;
}
export declare class JwtAuthGuard implements CanActivate {
    private readonly jwtService;
    private readonly prisma;
    private readonly reflector;
    constructor(jwtService: JwtService, prisma: PrismaService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractToken;
}
