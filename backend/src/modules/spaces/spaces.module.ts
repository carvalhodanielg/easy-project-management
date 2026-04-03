import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Space, SpaceSchema } from './schemas/space.schema';
import { SpaceMember, SpaceMemberSchema } from './schemas/space-member.schema';
import { SpacesService } from './spaces.service';
import { SpacesController } from './spaces.controller';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Space.name, schema: SpaceSchema },
      { name: SpaceMember.name, schema: SpaceMemberSchema },
    ]),
  ],
  controllers: [SpacesController],
  providers: [SpacesService, SpaceRoleGuard],
  exports: [SpacesService, SpaceRoleGuard, MongooseModule],
})
export class SpacesModule {}
