import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SavedFiltersService } from './saved-filters.service';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('spaces/:spaceId/saved-filters')
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
export class SavedFiltersController {
  constructor(private readonly savedFiltersService: SavedFiltersService) {}

  @Get()
  findAll(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.savedFiltersService.findBySpace(spaceId);
  }

  @Post()
  create(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: CreateSavedFilterDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.savedFiltersService.create(spaceId, user._id.toString(), dto);
  }

  @Patch(':id')
  update(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('id', ObjectIdValidationPipe) id: string,
    @Body() dto: UpdateSavedFilterDto,
  ) {
    return this.savedFiltersService.update(id, spaceId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('id', ObjectIdValidationPipe) id: string,
  ) {
    return this.savedFiltersService.remove(id, spaceId);
  }
}
