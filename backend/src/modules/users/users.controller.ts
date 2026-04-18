import {
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from './schemas/user.schema';
import { Types } from 'mongoose';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  async search(@Query('q') q: string) {
    const users = await this.usersService.search(q ?? '');
    return users.map((u) => this.usersService.toPublic(u));
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateUserDto,
  ) {
    const id = user._id.toString();
    const updated = await this.usersService.update(id, {
      displayName: dto.displayName,
    });
    return this.usersService.toPublic(updated);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: UserDocument,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const id = user._id.toString();
    const updated = await this.usersService.uploadAvatar(id, file);
    return this.usersService.toPublic(updated);
  }
}
