import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);