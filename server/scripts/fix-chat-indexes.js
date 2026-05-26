require("dotenv").config();
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env.local"),
  override: true,
});

const mongoose = require("mongoose");
const { ChatRoom } = require("../src/modules/chat/chat.model");

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

const isLegacyCustomerUniqueIndex = (index) =>
  index.unique === true &&
  index.key?.customerId === 1 &&
  Object.keys(index.key).length === 1 &&
  !index.partialFilterExpression;

const main = async () => {
  if (!mongoUri) {
    throw new Error("MONGO_URI or MONGODB_URI is required.");
  }

  await mongoose.connect(mongoUri);

  const unsetResult = await ChatRoom.updateMany(
    { isGuestSession: true, customerId: { $ne: null } },
    { $unset: { customerId: "" } },
  );

  const indexes = await ChatRoom.collection.indexes();
  const legacyIndex = indexes.find(isLegacyCustomerUniqueIndex);
  if (legacyIndex) {
    await ChatRoom.collection.dropIndex(legacyIndex.name);
    console.log(`Dropped legacy index: ${legacyIndex.name}`);
  }

  await ChatRoom.syncIndexes();
  console.log(`Updated guest rooms: ${unsetResult.modifiedCount}`);
  console.log("Chat room indexes are synced.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
