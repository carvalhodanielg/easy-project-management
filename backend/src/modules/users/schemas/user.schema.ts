import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export type ThemeMode = 'light' | 'dark';
export type TaskGroupBy = 'none' | 'status' | 'assignee';
export type TaskSubtaskMode = 'collapsed' | 'expanded' | 'separated';

// Extensible per-user preferences. Add new keys here as needed.
@Schema({ _id: false })
export class UserPreferences {
  @Prop({ type: String, enum: ['light', 'dark'], default: 'dark' })
  theme: ThemeMode;

  // Default grouping for task lists/sprints. 'none' = no grouping.
  @Prop({ type: String, enum: ['none', 'status', 'assignee'], default: 'none' })
  taskGroupBy: TaskGroupBy;

  @Prop({
    type: String,
    enum: ['collapsed', 'expanded', 'separated'],
    default: 'collapsed',
  })
  taskSubtaskMode: TaskSubtaskMode;
}

export const UserPreferencesSchema =
  SchemaFactory.createForClass(UserPreferences);

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  displayName: string;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;

  @Prop({ type: Boolean, default: false })
  emailVerified: boolean;

  @Prop({ type: UserPreferencesSchema, default: () => ({ theme: 'dark' }) })
  preferences: UserPreferences;
}

export const UserSchema = SchemaFactory.createForClass(User);
