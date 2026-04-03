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
import { ListsService } from './lists.service';
import { CreateListDto, UpdateListDto } from './dto/create-list.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import { SpaceRole } from '../spaces/schemas/space-member.schema';

@Controller('spaces/:spaceId/lists')
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Get()
  findAll(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.listsService.findBySpace(spaceId);
  }

  @Post()
  @Roles(SpaceRole.Editor)
  create(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: CreateListDto,
  ) {
    return this.listsService.create(spaceId, dto);
  }

  @Patch(':listId')
  @Roles(SpaceRole.Editor)
  update(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('listId', ObjectIdValidationPipe) listId: string,
    @Body() dto: UpdateListDto,
  ) {
    return this.listsService.update(spaceId, listId, dto);
  }

  @Delete(':listId')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('listId', ObjectIdValidationPipe) listId: string,
  ) {
    return this.listsService.remove(spaceId, listId);
  }
}
