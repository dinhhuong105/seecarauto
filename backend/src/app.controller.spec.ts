import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("root", () => {
    it("should return the SeeCar Auto greeting", () => {
      expect(appController.getHello()).toBe(
        "SeeCar Auto API — Automotive Parts E-commerce Platform (M00 foundation).",
      );
    });
  });

  describe("health", () => {
    it('should return status "ok" with service name and uptime', () => {
      const health = appController.getHealth();
      expect(health.status).toBe("ok");
      expect(health.service).toBe("seecarauto-backend");
      expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });
});
