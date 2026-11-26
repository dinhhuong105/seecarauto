import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";

@ApiTags("system")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "API root — returns a greeting." })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("health")
  @ApiOperation({ summary: "Health check used by Docker and load balancers." })
  @ApiResponse({ status: 200, description: "Service is up." })
  getHealth(): { status: string; service: string; uptimeSeconds: number } {
    return {
      status: "ok",
      service: "seecarauto-backend",
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
