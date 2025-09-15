import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";

/**
 * This E2E test validates successful and unsuccessful login flow for a
 * developer user.
 *
 * The test covers:
 *
 * 1. Developer user registration via /auth/developer/join with email and
 *    password hash.
 * 2. Login with correct credentials to /auth/developer/login, verifying JWT
 *    tokens and connection authorization header updates.
 * 3. Attempting login with incorrect password, expecting 401 Unauthorized
 *    error.
 * 4. Double login to ensure authorization token updates correctly.
 *
 * This test ensures robust authentication, JWT token management, and
 * correct error handling for invalid login attempts for the developer user
 * domain.
 */
export async function test_api_developer_login_success(
  connection: api.IConnection,
) {
  // Define the plain password to be used both for join and login
  const developerPlainPassword = "test_password_123!";

  // 1. Developer user registration
  //    Create a developer user account via /auth/developer/join, with valid email and password hash set equal to plain password
  const developerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: developerPlainPassword,
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;

  const createdDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(createdDeveloper);

  const developerEmail = developerCreateBody.email;

  // 2. Login with correct email and password
  const loginBody = {
    email: developerEmail,
    password: developerPlainPassword,
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;

  const loginResponse: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, { body: loginBody });
  typia.assert(loginResponse);

  TestValidator.equals(
    "Login email matches created developer",
    loginResponse.email,
    developerEmail,
  );

  TestValidator.equals(
    "Authorization token in connection header is updated",
    connection.headers?.Authorization,
    loginResponse.token.access,
  );

  // 3. Attempt login with wrong password - should throw 401 error
  const wrongPasswordBody = {
    email: developerEmail,
    password: developerPlainPassword + "wrong",
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;

  await TestValidator.error(
    "Login with wrong password should fail",
    async () => {
      await api.functional.auth.developer.login(connection, {
        body: wrongPasswordBody,
      });
    },
  );

  // 4. Login again to check the token update
  const secondLoginResponse: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, { body: loginBody });
  typia.assert(secondLoginResponse);

  TestValidator.notEquals(
    "Authorization token after second login is different",
    connection.headers?.Authorization,
    loginResponse.token.access,
  );

  TestValidator.equals(
    "Authorization token in connection header updated after second login",
    connection.headers?.Authorization,
    secondLoginResponse.token.access,
  );
}
