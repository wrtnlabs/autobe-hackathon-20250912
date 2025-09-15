import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * Full registration and login flow for QA users.
 *
 * This function carries out the entire QA user lifecycle in the system:
 *
 * 1. Register a new QA user with valid details
 * 2. Confirm successful creation and token receipt
 * 3. Log in the QA user with correct credentials
 * 4. Validate the issuance of JWT tokens on login
 * 5. Verify that login fails with invalid credentials
 */
export async function test_api_qa_registration_and_login_flow(
  connection: api.IConnection,
) {
  // Step 1: Register a new QA user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const password_hash: string = password; // Simulate password hash with plain password
  const name: string = RandomGenerator.name();
  const createBody = {
    email,
    password_hash,
    name,
  } satisfies ITaskManagementQa.ICreate;

  const authorizedUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, { body: createBody });
  typia.assert(authorizedUser);

  // Step 2: Log in the new QA user with correct credentials
  const loginBody = { email, password } satisfies ITaskManagementQa.ILogin;
  const loggedInUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, { body: loginBody });
  typia.assert(loggedInUser);

  // Step 3: Login error test with invalid credentials
  const wrongPassword = password + "wrong";
  const invalidLoginBody = {
    email,
    password: wrongPassword,
  } satisfies ITaskManagementQa.ILogin;
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.auth.qa.login(connection, { body: invalidLoginBody });
  });
}
