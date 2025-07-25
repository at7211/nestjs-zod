import { Logger, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { ZodSerializationException } from '@at7211/nestjs-zod';

@Catch(HttpException)
export class HttpExceptionFilter extends BaseExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: HttpException | ZodSerializationException, host: ArgumentsHost) {
        if (exception instanceof ZodSerializationException) {
            const zodError = exception.getZodError();
            this.logger.error(`ZodSerializationException: ${zodError.message}`);
        }

        super.catch(exception as HttpException, host);
    }
}
