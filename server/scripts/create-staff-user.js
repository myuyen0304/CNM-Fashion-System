require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { User } = require("../src/modules/auth/auth.model");
const { ROLES } = require("../src/shared/constants");

const parseArg = (name) => {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!raw) return "";
  return raw.slice(name.length + 3).trim();
};

const run = async () => {
  const name = parseArg("name");
  const email = parseArg("email").toLowerCase();
  const password = parseArg("password");
  const role = parseArg("role");

  if (!name || !email || !password || !role) {
    console.error(
      "Missing args. Example: npm run create:user -- --name=\"Supervisor A\" --email=supervisor@example.com --password=StrongPass123 --role=supervisor",
    );
    process.exit(1);
  }

  if (!Object.values(ROLES).includes(role) || role === ROLES.CUSTOMER) {
    console.error("Role must be one of: admin, supervisor, employee");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const hashed = await bcrypt.hash(password, 10);
    const existing = await User.findOne({ email });

    if (existing) {
      existing.name = name;
      existing.password = hashed;
      existing.role = role;
      existing.isActive = true;
      await existing.save();
      console.log(`Updated user ${email} with role ${role}`);
    } else {
      await User.create({
        name,
        email,
        password: hashed,
        role,
        isActive: true,
      });
      console.log(`Created user ${email} with role ${role}`);
    }
  } finally {
    await mongoose.connection.close();
  }
};

run().catch((error) => {
  console.error("create-staff-user failed:", error.message);
  process.exit(1);
});
