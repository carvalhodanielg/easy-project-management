import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SavedFiltersService } from './saved-filters.service';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';

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
    @Request() req: { user: { userId: string } },
  ) {
    return this.savedFiltersService.create(spaceId, req.user.userId, dto);
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
