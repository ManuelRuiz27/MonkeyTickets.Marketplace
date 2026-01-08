import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto.email, loginDto.password);
    }

    @Post('rp/login')
    async loginRP(@Body() loginDto: LoginDto) {
        return this.authService.loginRP(loginDto.email, loginDto.password);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    async logout(@Req() req: Request) {
        const authHeader = req.headers.authorization;
        const token = Array.isArray(authHeader)
            ? authHeader[0]?.replace('Bearer ', '')
            : authHeader?.replace('Bearer ', '');
        if (token) {
            await this.authService.blacklistToken(token);
        }
        return { message: 'Logged out successfully' };
    }
}
