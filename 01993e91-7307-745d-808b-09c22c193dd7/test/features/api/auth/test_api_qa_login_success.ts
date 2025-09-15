import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * Test scenario verifying successful QA user login.
 *
 * Steps:
 *
 * 1. Register a new QA user with valid email, password_hash, and name.
 * 2. Login with correct email and password.
 * 3. Verify that the login response is a valid authorized user with JWT token.
 * 4. Verify that login fails with incorrect password.
 * 5. Verify that login fails with non-existent email.
 */
export async function test_api_qa_login_success(connection: api.IConnection) {
  // 1. Register a QA user
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64); // example of hashed password
  const name = RandomGenerator.name();

  const createRequestBody = {
    email: email,
    password_hash: passwordHash,
    name: name,
  } satisfies ITaskManagementQa.ICreate;

  const authorizedUser = await api.functional.auth.qa.join(connection, {
    body: createRequestBody,
  });
  typia.assert(authorizedUser);

  // 2. Login with correct credentials
  const loginRequestBody = {
    email: email,
    password: passwordHash, // In test, using the plaintext as password is accepted
  } satisfies ITaskManagementQa.ILogin;

  const loginResult = await api.functional.auth.qa.login(connection, {
    body: loginRequestBody,
  });
  typia.assert(loginResult);

  TestValidator.equals(
    "login email matches registration",
    loginResult.email,
    email,
  );

  // 3. Test login fails on incorrect password
  await TestValidator.error("login fails with incorrect password", async () => {
    await api.functional.auth.qa.login(connection, {
      body: {
        email: email,
        password: passwordHash + "_wrong",
      } satisfies ITaskManagementQa.ILogin,
    });
  });

  // 4. Test login fails on non-existent email
  await TestValidator.error("login fails with non-existent email", async () => {
    await api.functional.auth.qa.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: passwordHash,
      } satisfies ITaskManagementQa.ILogin,
    });
  });
}
