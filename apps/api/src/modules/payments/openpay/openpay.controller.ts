import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, Logger, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { CreateOpenpayChargeDto } from './dto/create-openpay-charge.dto';
import { CreateSpeiChargeDto, CreateOxxoChargeDto } from './dto/create-alternative-payment.dto';
import { OpenpayChargeResult, OpenpayService } from './openpay.service';
import { OpenpayAlternativePaymentsService } from './openpay-alternative.service';

@Controller('payments/openpay')
export class OpenpayController {
    private readonly logger = new Logger(OpenpayController.name);

    constructor(
        private readonly openpayService: OpenpayService,
        private readonly alternativeService: OpenpayAlternativePaymentsService,
    ) { }

    /**
     * Endpoint para pago con tarjeta (existente)
     */
    @Post('charge')
    @HttpCode(HttpStatus.CREATED)
    async createCharge(
        @Body() body: CreateOpenpayChargeDto,
        @Req() req: Request,
    ): Promise<OpenpayChargeResult> {
        const clientIp = this.extractClientIp(req);
        this.logger.log(`Procesando cargo con tarjeta para orden ${body.orderId}`);
        return this.openpayService.createCharge(body, clientIp);
    }

    /**
     * Endpoint para generar cargo SPEI (transferencia bancaria)
     */
    @Post('spei')
    @HttpCode(HttpStatus.CREATED)
    async createSpeiCharge(@Body() createSpeiDto: CreateSpeiChargeDto) {
        this.logger.log(`Generando cargo SPEI para orden ${createSpeiDto.orderId}, monto: ${createSpeiDto.amount} ${createSpeiDto.currency}`);

        try {
            const result = await this.alternativeService.createSpeiCharge(createSpeiDto);
            this.logger.log(`Cargo SPEI creado exitosamente: ${result.id}`);
            return result;
        } catch (error: any) {
            this.logger.error(`Error creando cargo SPEI: ${error.message}`, error.stack);
            throw new BadRequestException(`No se pudo generar el cargo SPEI: ${error.message}`);
        }
    }

    /**
     * Endpoint para generar cargo OXXO (pago en tienda)
     */
    @Post('oxxo')
    @HttpCode(HttpStatus.CREATED)
    async createOxxoCharge(@Body() createOxxoDto: CreateOxxoChargeDto) {
        this.logger.log(`Generando cargo OXXO para orden ${createOxxoDto.orderId}, monto: ${createOxxoDto.amount} ${createOxxoDto.currency}`);

        try {
            const result = await this.alternativeService.createOxxoCharge(createOxxoDto);
            this.logger.log(`Cargo OXXO creado exitosamente: ${result.id}`);
            return result;
        } catch (error: any) {
            this.logger.error(`Error creando cargo OXXO: ${error.message}`, error.stack);
            throw new BadRequestException(`No se pudo generar el cargo OXXO: ${error.message}`);
        }
    }

    /**
     * Endpoint para consultar el estado de un cargo
     */
    @Get('charges/:chargeId')
    @HttpCode(HttpStatus.OK)
    async getChargeStatus(@Param('chargeId') chargeId: string) {
        this.logger.log(`Consultando estado de cargo: ${chargeId}`);

        try {
            const result = await this.alternativeService.getCharge(chargeId);
            this.logger.debug(`Estado del cargo ${chargeId}: ${result.status}`);
            return result;
        } catch (error: any) {
            this.logger.error(`Error consultando cargo ${chargeId}: ${error.message}`);
            throw new BadRequestException(`No se pudo consultar el cargo: ${error.message}`);
        }
    }

    /**
     * Extrae la IP del cliente con múltiples fallbacks para robustez en producción
     */
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
