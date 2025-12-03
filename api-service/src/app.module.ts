import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UsersService } from './users/users.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async onModuleInit() {
    // Create default user on startup
    const defaultEmail = this.configService.get<string>('DEFAULT_USER_EMAIL');
    const defaultPassword = this.configService.get<string>('DEFAULT_USER_PASSWORD');
    const defaultName = this.configService.get<string>('DEFAULT_USER_NAME') || 'Admin';

    if (defaultEmail && defaultPassword) {
      await this.usersService.createDefaultUser(defaultEmail, defaultPassword, defaultName);
    }
  }
}
