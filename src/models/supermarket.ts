import mongoose, { Schema, Document } from 'mongoose';

export type SupermarketDocument = Document & {
  name: string;
  week: {
    day1: string;
    day2: string;
    day3: string;
    day4: string;
    day5: string;
    day6: string;
  };
};

const supermarketSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    week: {
      day1: String,
      day2: String,
      day3: String,
      day4: String,
      day5: String,
      day6: String,
    },
  },

  { timestamps: true },
);

// Export the model and return your Supermarket interface
export const Supermarket = mongoose.model<SupermarketDocument>(
  'Supermarket',
  supermarketSchema,
);
