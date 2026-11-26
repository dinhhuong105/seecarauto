import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHello(): string {
    return "SeeCar Auto API — Automotive Parts E-commerce Platform (M00 foundation).";
  }
}
