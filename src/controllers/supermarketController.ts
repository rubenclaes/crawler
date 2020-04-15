import { Supermarket, SupermarketDocument } from '../models/supermarketschema';

export const upsertSupermarket = async (
  name: string,
  day1: string,
  day2: string,
  day3: string,
  day4: string,
  day5: string,
  day6: string,
) => {
  const supermarket = new Supermarket({
    name: name,
    day1: day1,
    day2: day2,
    day3: day3,
    day4: day4,
    day5: day5,
    day6: day6,
  });

  const filter = {
    name: name,
  };
  const update = supermarket;

  const newSupermarket = await Supermarket.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
  });

  console.log(newSupermarket);
};

export const findSupermarket = async (name: string) => {
  await Supermarket.find({
    name: name,
  }).then((supermarket) => {
    console.log(`Supermarket found! ${supermarket}`);
  });
};
