import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        const isHttpException = exception instanceof HttpException;
        const status = isHttpException
            ? (exception as HttpException).getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        // Log always with máximo detalle en servidor,
        // pero sin exponer internals al cliente.
        if (exception instanceof Error) {
            this.logger.error(
                `Unhandled exception: ${exception.message}`,
                exception.stack,
            );
        } else {
            this.logger.error(`Unhandled non-error exception: ${String(exception)}`);
        }

        // Para HttpException respetamos el response definido en la capa de dominio.
        if (isHttpException) {
            const httpException = exception as HttpException;
            const responseBody = httpException.getResponse();

            return response.status(status).json(responseBody);
        }

        // Para errores no controlados devolvemos una respuesta genérica.
        const genericBody = {
            statusCode: status,
            message: 'Ha ocurrido un error inesperado. Intenta de nuevo más tarde.',
            path: request?.url,
            timestamp: new Date().toISOString(),
        };

        return response.status(status).json(genericBody);
    }
}

