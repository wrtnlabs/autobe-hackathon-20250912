import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";

/**
 * This end-to-end test validates the developer login flow, covering creation,
 * successful login, and failure cases.
 *
 * It follows the scenario:
 *
 * 1. Register a new developer user account with a fixed password.
 * 2. Verify user creation and returned tokens.
 * 3. Login successfully with correct credentials.
 * 4. Check the JWT tokens in the successful login.
 * 5. Test login attempt with wrong password expecting error.
 * 6. Test login with unknown email expecting error.
 */
export async function test_api_developer_login_success_and_failure(
  connection: api.IConnection,
) {
  // Define fixed plaintext password
  const fixedPassword = "correct_password";

  // Create developer account data using fixed password as password_hash
  // to match login plaintext (simulate equal password)
  const developerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: false,
    password_hash: fixedPassword,
  } satisfies IOauthServerDeveloper.ICreate;

  // 1. Create developer user account
  const createdDeveloper = await api.functional.auth.developer.join(
    connection,
    {
      body: developerCreateBody,
    },
  );
  typia.assert(createdDeveloper);
  TestValidator.predicate(
    "created developer has an access token",
    typeof createdDeveloper.token.access === "string" &&
      createdDeveloper.token.access.length > 0,
  );
  TestValidator.equals(
    "created developer email matches",
    createdDeveloper.email,
    developerCreateBody.email,
  );

  // Login body with correct password
  const developerLoginBody = {
    email: developerCreateBody.email,
    password: fixedPassword,
  } satisfies IOauthServerDeveloper.ILogin;

  // 2. Successful login attempt
  const loginSuccess = await api.functional.auth.developer.login(connection, {
    body: developerLoginBody,
  });
  typia.assert(loginSuccess);
  TestValidator.equals(
    "login success email equals join email",
    loginSuccess.email,
    developerCreateBody.email,
  );
  TestValidator.predicate(
    "login success access token is string",
    typeof loginSuccess.token.access === "string" &&
      loginSuccess.token.access.length > 0,
  );

  // 3. Login attempt with wrong password should throw error
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.auth.developer.login(connection, {
      body: {
        email: developerCreateBody.email,
        password: "wrong_password",
      } satisfies IOauthServerDeveloper.ILogin,
    });
  });

  // 4. Login attempt with non-existent email should throw error
  await TestValidator.error("login fails with unknown email", async () => {
    await api.functional.auth.developer.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "no_account_password",
      } satisfies IOauthServerDeveloper.ILogin,
    });
  });
}
