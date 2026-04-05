import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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

  async search(q: string): Promise<UserDocument[]> {
    if (!q || q.trim().length === 0) return [];
    const regex = new RegExp(q.trim(), 'i');
    return this.userModel
      .find({ $or: [{ email: regex }, { displayName: regex }] })
      .select('-passwordHash')
      .limit(10)
      .exec();
  }

  toPublic(user: UserDocument) {
    return {
      _id: (user._id as Types.ObjectId).toString(),
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }
}
