import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import { IsString, MinLength, MaxLength } from 'class-validator';

class SearchQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q: string;
}

@Controller('spaces/:spaceId/search')
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Query() query: SearchQueryDto,
  ) {
    return this.searchService.search(spaceId, query.q ?? '');
  }
}
