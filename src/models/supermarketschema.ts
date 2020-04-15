import mongoose, { Schema, Document } from 'mongoose';

export type SupermarketDocument = Document & {
  name: string;
  day1: string;
  day2: string;
  day3: string;
  day4: string;
  day5: string;
  day6: string;
};

const storeSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  day1: { type: String, required: true },
  day2: { type: String, required: true },
  day3: { type: String, required: true },
  day4: { type: String, required: true },
  day5: { type: String, required: true },
  day6: { type: String, required: true },
});

// Export the model and return your Supermarket interface
export const Supermarket = mongoose.model<SupermarketDocument>(
  'Supermarket',
  storeSchema,
);
