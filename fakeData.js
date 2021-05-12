const faker = require("faker");

// const fakeUser = {
//   name: faker.name.findName(),
//   email: faker.internet.email(),
//   password: faker.internet.password(),
// };

const generateUses = () => {
  let userNumber = 10;
  const users = [];
  while (userNumber) {
    users.push({
      name: faker.name.findName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
    });
    userNumber--;
  }
  return users;
};
module.exports = generateUses;
