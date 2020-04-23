import { User, UserDocument } from '../models/user';

export const insertUsers = async (users: UserDocument[]) => {
  // save multiple documents to the collection referenced by User Model
  User.collection.insertMany(users, function (err, docs) {
    if (err) {
      return console.error(err);
    } else {
      console.log('Multiple documents inserted to Collection');
    }
  });
};

export const findUsers = async () => {
  console.log('Searching users');

  try {
    const found = await User.find({
      subscribed: true,
    })
      .select('-__v')
      .sort('name')
      .then((users) => {
        return users;
      });
    console.log(`Users found! ${found}`);
    return found;
  } catch (error) {
    throw new Error(error);
  }
};
