import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
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
    async logout(@Req() req: any) {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            await this.authService.blacklistToken(token);
        }
        return { message: 'Logged out successfully' };
    }
}
