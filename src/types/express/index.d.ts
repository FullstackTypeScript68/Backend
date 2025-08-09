// types/express/index.d.ts
import "express";

declare module "express" {
  interface Request {
    file?: Express.Multer.File;
  }
}
