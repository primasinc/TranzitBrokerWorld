// Simple in-memory user model - no MongoDB dependencies
export interface IUser {
  id: string;
  email: string;
  username: string;
  password: string;
  createdAt: Date;
}

export class User implements IUser {
  id: string;
  email: string;
  username: string;
  password: string;
  createdAt: Date;

  constructor(data: Partial<IUser>) {
    this.id = data.id || this.generateId();
    this.email = data.email || '';
    this.username = data.username || '';
    this.password = data.password || '';
    this.createdAt = data.createdAt || new Date();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Static methods to simulate Mongoose-like behavior
  static async find(): Promise<User[]> {
    // In-memory storage - would be replaced with actual data source
    return [];
  }

  static async findOne(filter: Partial<IUser>): Promise<User | null> {
    // In-memory search - would be replaced with actual data source
    return null;
  }

  static async create(data: Partial<IUser>): Promise<User> {
    return new User(data);
  }

  async save(): Promise<User> {
    // In-memory save - would be replaced with actual persistence
    return this;
  }
}