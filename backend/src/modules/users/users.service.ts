import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { R2StorageService } from '../../common/r2/r2-storage.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly r2: R2StorageService,
  ) {}

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async create(data: {
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after' })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updatePassword(
    id: string,
    passwordHash: string,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { passwordHash }, { returnDocument: 'after' })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updatePreferences(
    id: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserDocument> {
    // Merge by dot-notation so siblings under `preferences` are preserved
    // as new preference keys are added over time.
    const set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) set[`preferences.${key}`] = value;
    }
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: set }, { returnDocument: 'after' })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async search(q: string): Promise<UserDocument[]> {
    if (!q || q.trim().length === 0) return [];
    const regex = new RegExp(q.trim(), 'i');
    return this.userModel
      .find({ $or: [{ email: regex }, { displayName: regex }] })
      .select('-passwordHash')
      .limit(10)
      .exec();
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UserDocument> {
    const existing = await this.userModel.findById(userId).exec();
    if (!existing) throw new NotFoundException('User not found');
    const oldAvatarUrl = existing.avatarUrl;

    const key = `avatars/${randomUUID()}${path.extname(file.originalname)}`;
    const avatarUrl = await this.r2.upload(key, file.buffer, file.mimetype);

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { avatarUrl }, { returnDocument: 'after' })
      .exec();

    if (oldAvatarUrl) {
      const oldKey = oldAvatarUrl.split('/').slice(-2).join('/');
      try {
        await this.r2.delete(oldKey);
      } catch {
        // ignore — DB already updated
      }
    }

    return updated!;
  }

  toPublic(user: UserDocument) {
    return {
      _id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      preferences: user.preferences,
    };
  }
}
