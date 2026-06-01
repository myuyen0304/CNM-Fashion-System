const test = require("node:test");
const assert = require("node:assert/strict");
const authRepo = require("./auth.repository");
const emailService = require("../../shared/services/emailService");

const authServicePath = require.resolve("./auth.service");

const createUser = (overrides = {}) => ({
  _id: "user-1",
  name: "Nguyen Van A",
  email: "user@example.com",
  isActive: true,
  isVerified: false,
  ...overrides,
});

const loadAuthService = (t, { allowFallback = false, sendEmail } = {}) => {
  const originalEnv = {
    ALLOW_DEMO_OTP_FALLBACK: process.env.ALLOW_DEMO_OTP_FALLBACK,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };

  process.env.ALLOW_DEMO_OTP_FALLBACK = allowFallback ? "true" : "false";
  process.env.JWT_SECRET = "test-jwt-secret";
  process.env.NODE_ENV = "test";

  if (sendEmail) {
    t.mock.method(emailService, "sendRegistrationOtpEmail", sendEmail);
  }

  delete require.cache[authServicePath];
  const authService = require(authServicePath);

  t.after(() => {
    delete require.cache[authServicePath];

    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  return authService;
};

const mockRegisterRepoSuccess = (t, user = createUser()) => {
  t.mock.method(authRepo, "findUserByEmail", async () => null);
  t.mock.method(authRepo, "createUser", async (payload) => ({
    ...user,
    ...payload,
    _id: user._id,
  }));
  t.mock.method(authRepo, "findOtpToken", async () => null);
  t.mock.method(authRepo, "upsertOtpToken", async (payload) => ({
    _id: "otp-1",
    ...payload,
  }));
  t.mock.method(authRepo, "deleteUserById", async () => ({}));
  return t.mock.method(authRepo, "deleteOtpToken", async () => ({}));
};

test("register returns verification response when OTP email is sent", async (t) => {
  const sendEmailMock = async () => ({ messageId: "mail-1" });
  mockRegisterRepoSuccess(t);
  const authService = loadAuthService(t, { sendEmail: sendEmailMock });

  const result = await authService.register({
    name: "Nguyen Van A",
    email: "USER@example.com",
    password: "Password1",
  });

  assert.equal(result.email, "user@example.com");
  assert.equal(result.requiresVerification, true);
  assert.equal(result.debugOtp, undefined);
  assert.equal(result.otpDelivery, undefined);
});

test("register returns demo OTP when email fails and fallback is enabled", async (t) => {
  mockRegisterRepoSuccess(t);
  const authService = loadAuthService(t, {
    allowFallback: true,
    sendEmail: async () => {
      throw new Error("smtp timeout");
    },
  });

  const result = await authService.register({
    name: "Nguyen Van A",
    email: "user@example.com",
    password: "Password1",
  });

  assert.equal(result.email, "user@example.com");
  assert.equal(result.requiresVerification, true);
  assert.equal(result.otpDelivery, "fallback");
  assert.match(result.debugOtp, /^\d{6}$/);
});

test("register rejects and rolls back new user when email fails without fallback", async (t) => {
  const deleteOtpMock = mockRegisterRepoSuccess(t);
  const deleteUserMock = authRepo.deleteUserById;
  const authService = loadAuthService(t, {
    sendEmail: async () => {
      throw new Error("smtp timeout");
    },
  });

  await assert.rejects(
    () =>
      authService.register({
        name: "Nguyen Van A",
        email: "user@example.com",
        password: "Password1",
      }),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.match(error.message, /Không gửi được OTP xác thực/i);
      return true;
    },
  );

  assert.equal(deleteOtpMock.mock.calls.length, 1);
  assert.deepEqual(deleteOtpMock.mock.calls[0].arguments, [
    "user@example.com",
    "register_verification",
  ]);
  assert.equal(deleteUserMock.mock.calls.length, 1);
  assert.deepEqual(deleteUserMock.mock.calls[0].arguments, ["user-1"]);
});

test("register retries an existing unverified account", async (t) => {
  const existingUser = createUser({ _id: "user-existing" });
  t.mock.method(authRepo, "findUserByEmail", async () => existingUser);
  const updateUserMock = t.mock.method(authRepo, "updateUser", async (_id, updates) => ({
    ...existingUser,
    ...updates,
  }));
  const createUserMock = t.mock.method(authRepo, "createUser", async () => {
    throw new Error("should not create a second user");
  });
  t.mock.method(authRepo, "findOtpToken", async () => null);
  t.mock.method(authRepo, "upsertOtpToken", async (payload) => ({
    _id: "otp-1",
    ...payload,
  }));

  const authService = loadAuthService(t, {
    sendEmail: async () => ({ messageId: "mail-1" }),
  });

  const result = await authService.register({
    name: "Nguyen Van B",
    email: "user@example.com",
    password: "Password1",
  });

  assert.equal(result.email, "user@example.com");
  assert.equal(result.requiresVerification, true);
  assert.equal(updateUserMock.mock.calls.length, 1);
  assert.equal(updateUserMock.mock.calls[0].arguments[0], "user-existing");
  assert.equal(updateUserMock.mock.calls[0].arguments[1].name, "Nguyen Van B");
  assert.equal(updateUserMock.mock.calls[0].arguments[1].isVerified, false);
  assert.equal(createUserMock.mock.calls.length, 0);
});

test("register keeps an existing unverified account when retry email fails", async (t) => {
  const existingUser = createUser({ _id: "user-existing" });
  t.mock.method(authRepo, "findUserByEmail", async () => existingUser);
  t.mock.method(authRepo, "updateUser", async (_id, updates) => ({
    ...existingUser,
    ...updates,
  }));
  t.mock.method(authRepo, "createUser", async () => {
    throw new Error("should not create a second user");
  });
  t.mock.method(authRepo, "findOtpToken", async () => null);
  t.mock.method(authRepo, "upsertOtpToken", async (payload) => ({
    _id: "otp-1",
    ...payload,
  }));
  const deleteOtpMock = t.mock.method(
    authRepo,
    "deleteOtpToken",
    async () => ({}),
  );
  const deleteUserMock = t.mock.method(authRepo, "deleteUserById", async () => {
    throw new Error("should not delete an existing unverified user");
  });

  const authService = loadAuthService(t, {
    sendEmail: async () => {
      throw new Error("smtp timeout");
    },
  });

  await assert.rejects(
    () =>
      authService.register({
        name: "Nguyen Van B",
        email: "user@example.com",
        password: "Password1",
      }),
    (error) => {
      assert.equal(error.statusCode, 503);
      return true;
    },
  );

  assert.equal(deleteOtpMock.mock.calls.length, 1);
  assert.equal(deleteUserMock.mock.calls.length, 0);
});

test("resendRegistrationOtp restores the previous OTP when email fails", async (t) => {
  const user = createUser();
  const previousOtp = {
    _id: "otp-existing",
    userId: user._id,
    email: user.email,
    purpose: "register_verification",
    otpHash: "old-hash",
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 2,
    resendCount: 1,
    lastSentAt: new Date(Date.now() - 2 * 60 * 1000),
  };

  t.mock.method(authRepo, "findUserByEmail", async () => user);
  t.mock.method(authRepo, "findOtpToken", async () => previousOtp);
  const upsertMock = t.mock.method(authRepo, "upsertOtpToken", async (payload) => ({
    _id: "otp-upserted",
    ...payload,
  }));
  const deleteOtpMock = t.mock.method(authRepo, "deleteOtpToken", async () => {
    throw new Error("should restore the existing token instead of deleting it");
  });

  const authService = loadAuthService(t, {
    sendEmail: async () => {
      throw new Error("smtp timeout");
    },
  });

  await assert.rejects(
    () => authService.resendRegistrationOtp(user.email),
    (error) => {
      assert.equal(error.statusCode, 503);
      return true;
    },
  );

  assert.equal(upsertMock.mock.calls.length, 2);
  const restoredPayload = upsertMock.mock.calls[1].arguments[0];
  assert.equal(restoredPayload.otpHash, previousOtp.otpHash);
  assert.equal(restoredPayload.attempts, previousOtp.attempts);
  assert.equal(restoredPayload.resendCount, previousOtp.resendCount);
  assert.equal(restoredPayload.lastSentAt, previousOtp.lastSentAt);
  assert.equal(deleteOtpMock.mock.calls.length, 0);
});

test("resendRegistrationOtp deletes a newly created OTP when email fails without a previous token", async (t) => {
  const user = createUser();

  t.mock.method(authRepo, "findUserByEmail", async () => user);
  t.mock.method(authRepo, "findOtpToken", async () => null);
  const upsertMock = t.mock.method(authRepo, "upsertOtpToken", async (payload) => ({
    _id: "otp-new",
    ...payload,
  }));
  const deleteOtpMock = t.mock.method(authRepo, "deleteOtpToken", async () => ({}));

  const authService = loadAuthService(t, {
    sendEmail: async () => {
      throw new Error("smtp timeout");
    },
  });

  await assert.rejects(
    () => authService.resendRegistrationOtp(user.email),
    (error) => {
      assert.equal(error.statusCode, 503);
      return true;
    },
  );

  assert.equal(upsertMock.mock.calls.length, 1);
  assert.equal(deleteOtpMock.mock.calls.length, 1);
  assert.deepEqual(deleteOtpMock.mock.calls[0].arguments, [
    user.email,
    "register_verification",
  ]);
});
