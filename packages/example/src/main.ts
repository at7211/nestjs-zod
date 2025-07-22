import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { patchNestJsSwagger } from '@at7211/nestjs-zod';
import { setupDtoPreRegistration } from './setup';

// Setup DTO pre-registration before anything else
setupDtoPreRegistration();

patchNestJsSwagger();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  // Enable CORS for GraphQL playground
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Example API')
    .setDescription('Example API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3001);
  console.log(`🚀 Application is running on: http://localhost:3001`);
  console.log(`🎮 GraphQL Playground: http://localhost:3001/graphql`);
  console.log(`📚 Swagger API Docs: http://localhost:3001/api`);
}
bootstrap();
