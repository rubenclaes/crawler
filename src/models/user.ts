import mongoose, { Schema, Document } from 'mongoose';

export type UserDocument = Document & {
  name: string;
  email: string;
  subscribed: boolean;
};

const userSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    email: String,
    subscribed: Boolean,
  },

  { timestamps: true },
);

// Export the model and return your User interface
export const User = mongoose.model<UserDocument>('User', userSchema);
