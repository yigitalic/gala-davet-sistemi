import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SecurityModule } from '../security/security.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@Module({
  imports: [forwardRef(() => SecurityModule)],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, RateLimitGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, RateLimitGuard],
})
export class AuthModule {}
