import { Supermarket, SupermarketDocument } from '../models/supermarket';

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

  // console.log(newSupermarket);
};

export const findSupermarkets = async (supermarkets: string[]) => {
  console.log('Searching supermarkets');

  try {
    const found = await Supermarket.find({
      name: {
        $in: supermarkets,
      },
    })
      .select('-__v')
      .sort('name')
      .then((supermarkets) => {
        return supermarkets;
      });
    console.log(`Supermarkets found!`);
    return found;
  } catch (error) {
    throw new Error(error);
  }
};

export const insertSupermarkets = async (
  supermarkets: SupermarketDocument[],
) => {
  // save multiple documents to the collection referenced by Book Model
  Supermarket.collection.insertMany(supermarkets, function (err, docs) {
    if (err) {
      return console.error(err);
    } else {
      console.log('Multiple documents inserted to Collection');
    }
  });
};

export const updateSupermarkets = async (
  supermarkets: SupermarketDocument[],
) => {
  // save multiple documents to the collection referenced by Book Model
  Supermarket.collection.updateMany(supermarkets, function (err, docs) {
    if (err) {
      return console.error(err);
    } else {
      console.log('Multiple documents updated to Collection');
    }
  });
};

export const findSupermarketAndUpdate = async (
  id: any,
  dataObj: SupermarketDocument,
) => {
  // save multiple documents to the collection referenced by Book Model
  Supermarket.collection.findOneAndUpdate({ _id: id }, dataObj, function (
    err,
    docs,
  ) {
    if (err) {
      return console.error(err);
    } else {
      console.log('Supermarket updated to Collection');
    }
  });
};
