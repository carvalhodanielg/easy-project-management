import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavedFilter, SavedFilterSchema } from './schemas/saved-filter.schema';
import { SavedFiltersService } from './saved-filters.service';
import { SavedFiltersController } from './saved-filters.controller';
import { SpacesModule } from '../spaces/spaces.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SavedFilter.name, schema: SavedFilterSchema },
    ]),
    SpacesModule,
  ],
  controllers: [SavedFiltersController],
  providers: [SavedFiltersService],
})
export class SavedFiltersModule {}
