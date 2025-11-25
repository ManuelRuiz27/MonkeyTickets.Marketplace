import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CreateOpenpayChargeDto } from './dto/create-openpay-charge.dto';
import { OpenpayChargeResult, OpenpayService } from './openpay.service';

@Controller('payments/openpay')
export class OpenpayController {
    constructor(
        private readonly openpayService: OpenpayService,
    ) { }

    @Post('charge')
    @HttpCode(HttpStatus.CREATED)
    async createCharge(
        @Body() body: CreateOpenpayChargeDto,
        @Req() req: Request,
    ): Promise<OpenpayChargeResult> {
        const clientIp = this.extractClientIp(req);
        return this.openpayService.createCharge(body, clientIp);
    }

    private extractClientIp(req: Request): string {
        const forwarded = req.headers['x-forwarded-for'];
        if (Array.isArray(forwarded) && forwarded.length > 0) {
            return forwarded[0].split(',')[0].trim();
        }
        if (typeof forwarded === 'string' && forwarded.length > 0) {
            return forwarded.split(',')[0].trim();
        }

        const realIp = req.headers['x-real-ip'];
        if (Array.isArray(realIp) && realIp.length > 0) {
            return realIp[0];
        }
        if (typeof realIp === 'string' && realIp.length > 0) {
            return realIp;
        }

        if (req.ip) {
            return req.ip;
        }

        if (typeof req.socket?.remoteAddress === 'string') {
            return req.socket.remoteAddress;
        }

        return '0.0.0.0';
    }
}
