import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Space, SpaceSchema } from './schemas/space.schema';
import { SpaceMember, SpaceMemberSchema } from './schemas/space-member.schema';
import {
  SpaceInvitation,
  SpaceInvitationSchema,
} from './schemas/space-invitation.schema';
import { SpacesService } from './spaces.service';
import { InvitationsService } from './invitations.service';
import { SpacesController } from './spaces.controller';
import { InvitationsController } from './invitations.controller';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Space.name, schema: SpaceSchema },
      { name: SpaceMember.name, schema: SpaceMemberSchema },
      { name: SpaceInvitation.name, schema: SpaceInvitationSchema },
    ]),
    UsersModule,
  ],
  controllers: [SpacesController, InvitationsController],
  providers: [SpacesService, InvitationsService, SpaceRoleGuard],
  exports: [SpacesService, SpaceRoleGuard, MongooseModule],
})
export class SpacesModule {}
