import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";

/**
 * Validates the login flow for Designer users.
 *
 * Business Steps:
 *
 * 1. Register a new Designer user with a valid unique email and hashed password.
 * 2. Attempt a successful login with correct credentials.
 * 3. Validate that the authorized data contains correct user info and tokens.
 * 4. Attempt login with incorrect password to confirm failure handling.
 * 5. Attempt login with non-existent email to confirm failure handling.
 *
 * This tests secure user authentication and proper error responses.
 */
export async function test_api_designer_login_successful(
  connection: api.IConnection,
) {
  // Step 1: Designer registration with randomized but valid input
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // plaintext password for login
  const passwordHash = `hashed-${password}`; // Simulated hashed password for join
  const name = RandomGenerator.name();

  const createBody = {
    email: email,
    password_hash: passwordHash,
    name: name,
  } satisfies ITaskManagementDesigner.ICreate;

  const joinedDesigner = await api.functional.auth.designer.join(connection, {
    body: createBody,
  });
  typia.assert(joinedDesigner);

  TestValidator.equals("joined email matches", joinedDesigner.email, email);
  TestValidator.equals("joined name matches", joinedDesigner.name, name);

  // Step 2: Successful login with correct email and plaintext password
  const loginBody = {
    email: email,
    password: password,
  } satisfies ITaskManagementDesigner.ILogin;

  const authorizedDesigner = await api.functional.auth.designer.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(authorizedDesigner);

  TestValidator.equals(
    "authorized email matches",
    authorizedDesigner.email,
    email,
  );

  TestValidator.equals(
    "authorized name matches",
    authorizedDesigner.name,
    name,
  );

  // Validate token properties
  TestValidator.predicate(
    "access token exists",
    authorizedDesigner.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token exists",
    authorizedDesigner.token.refresh.length > 0,
  );

  // Step 3: Login failure with incorrect password
  const wrongPasswordBody = {
    email: email,
    password: password + "wrong",
  } satisfies ITaskManagementDesigner.ILogin;

  await TestValidator.error("login fails with incorrect password", async () => {
    await api.functional.auth.designer.login(connection, {
      body: wrongPasswordBody,
    });
  });

  // Step 4: Login failure with non-existent email
  const nonExistentEmailLoginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: password,
  } satisfies ITaskManagementDesigner.ILogin;

  await TestValidator.error("login fails with non-existent email", async () => {
    await api.functional.auth.designer.login(connection, {
      body: nonExistentEmailLoginBody,
    });
  });
}
