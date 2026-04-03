import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TagsService, CreateTagDto, UpdateTagDto } from './tags.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import { SpaceRole } from '../spaces/schemas/space-member.schema';
import { Task } from '../tasks/schemas/task.schema';
import { IsString, IsOptional, MaxLength, MinLength, Matches } from 'class-validator';

class CreateTagBodyDto implements CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color' })
  color?: string;
}

class UpdateTagBodyDto implements UpdateTagDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color' })
  color?: string;
}

@Controller('spaces/:spaceId/tags')
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
export class TagsController {
  constructor(
    private readonly tagsService: TagsService,
    @InjectModel(Task.name) private readonly taskModel: Model<unknown>,
  ) {}

  @Get()
  findAll(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.tagsService.findBySpace(spaceId);
  }

  @Post()
  @Roles(SpaceRole.Editor)
  create(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: CreateTagBodyDto,
  ) {
    return this.tagsService.create(spaceId, dto);
  }

  @Patch(':tagId')
  @Roles(SpaceRole.Editor)
  update(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('tagId', ObjectIdValidationPipe) tagId: string,
    @Body() dto: UpdateTagBodyDto,
  ) {
    return this.tagsService.update(spaceId, tagId, dto);
  }

  @Delete(':tagId')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('tagId', ObjectIdValidationPipe) tagId: string,
  ) {
    return this.tagsService.remove(spaceId, tagId, this.taskModel);
  }
}
