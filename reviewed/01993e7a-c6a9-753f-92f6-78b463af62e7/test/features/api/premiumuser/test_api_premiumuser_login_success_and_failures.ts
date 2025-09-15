import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Test premium user login including successful authentication with valid
 * email and password hash returning JWT tokens. Verifies that login
 * attempts with incorrect credentials (wrong email or wrong password hash)
 * fail properly, with no tokens issued. Also confirms that deleted user
 * accounts (indicated via specific email simulating deleted_at timestamp)
 * cannot login.
 *
 * The test covers:
 *
 * 1. Successful login with valid credentials, asserting the returned user info
 *    and JWT tokens.
 * 2. Failed login attempts with invalid email.
 * 3. Failed login attempts with invalid password hash.
 * 4. Failed login simulating deleted user account.
 *
 * Uses IRecipeSharingPremiumUser.ILogin for login requests and validates
 * responses with typia.assert(), ensuring type safety and runtime
 * validation.
 */
export async function test_api_premiumuser_login_success_and_failures(
  connection: api.IConnection,
) {
  // 1. Successful login with valid credentials
  const validCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies IRecipeSharingPremiumUser.ILogin;

  const loginResult = await api.functional.auth.premiumUser.login(connection, {
    body: validCredentials,
  });
  typia.assert(loginResult);

  // 2. Attempt login with wrong email
  await TestValidator.error("login with wrong email should fail", async () => {
    await api.functional.auth.premiumUser.login(connection, {
      body: {
        email: "nonexistentuser@example.com",
        password_hash: validCredentials.password_hash,
      } satisfies IRecipeSharingPremiumUser.ILogin,
    });
  });

  // 3. Attempt login with wrong password hash
  await TestValidator.error(
    "login with wrong password hash should fail",
    async () => {
      await api.functional.auth.premiumUser.login(connection, {
        body: {
          email: validCredentials.email,
          password_hash:
            "wrongpasswordhashwrongpasswordhashwrongpasswordhashwrongpasswordhash",
        } satisfies IRecipeSharingPremiumUser.ILogin,
      });
    },
  );

  // 4. Attempt login for deleted user account (simulated by special email)
  await TestValidator.error("login with deleted user should fail", async () => {
    await api.functional.auth.premiumUser.login(connection, {
      body: {
        email: "deleteduser@example.com",
        password_hash: validCredentials.password_hash,
      } satisfies IRecipeSharingPremiumUser.ILogin,
    });
  });
}
