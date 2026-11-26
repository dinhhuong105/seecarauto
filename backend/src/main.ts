import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix: all REST endpoints live under /api/v1 (English only).
  app.setGlobalPrefix("api/v1");

  // CORS: frontend + admin origins only. Tighten per environment in M02.
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001",
  ];
  app.enableCors({ origin: allowedOrigins });

  // Swagger / OpenAPI docs at /api/docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle("SEECARAUTO API")
    .setDescription(
      "SeeCar Auto — Automotive Parts E-commerce Platform API (REST, /api/v1).",
    )
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SEECARAUTO backend listening on port ${port}`);
}
bootstrap();
