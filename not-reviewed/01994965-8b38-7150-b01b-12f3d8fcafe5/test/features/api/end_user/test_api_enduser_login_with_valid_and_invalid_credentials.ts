import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

export async function test_api_enduser_login_with_valid_and_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Generate plaintext password and register a new end user
  const plaintextPassword = RandomGenerator.alphaNumeric(16);

  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: plaintextPassword,
  } satisfies ITelegramFileDownloaderEndUser.ICreate;

  const created: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Step 2: Successful login attempt with correct plaintext password
  const loginBody = {
    email: createBody.email,
    password: plaintextPassword, // Use plaintext password for login
  } satisfies ITelegramFileDownloaderEndUser.ILogin;

  const loggedIn: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  TestValidator.equals(
    "Logged in user email matches registered email",
    loggedIn.email,
    createBody.email,
  );

  TestValidator.predicate(
    "JWT access token exists",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );

  TestValidator.predicate(
    "JWT refresh token exists",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );

  // Step 3: Failed login attempt with incorrect password
  const wrongPasswordBody = {
    email: createBody.email,
    password: RandomGenerator.alphaNumeric(12), // wrong password
  } satisfies ITelegramFileDownloaderEndUser.ILogin;

  await TestValidator.error("Invalid login with wrong password", async () => {
    await api.functional.auth.endUser.login(connection, {
      body: wrongPasswordBody,
    });
  });

  // Step 4: Failed login attempt with non-existent email
  const nonExistentEmailBody = {
    email: `nonexistent_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITelegramFileDownloaderEndUser.ILogin;

  await TestValidator.error(
    "Invalid login with non-existent email",
    async () => {
      await api.functional.auth.endUser.login(connection, {
        body: nonExistentEmailBody,
      });
    },
  );
}
