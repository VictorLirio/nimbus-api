import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';

@Module({
  controllers: [],
  providers: [AdminService],
})
export class AdminModule {}
