import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * Test login failure scenario for systemAdmin using incorrect password.
 *
 * This test verifies that the systemAdmin login endpoint rejects
 * authentication when provided with a correct email but wrong password.
 *
 * Flow:
 *
 * 1. Create a new systemAdmin user account using the join endpoint with a
 *    valid email and password.
 * 2. Attempt login with the same email but an incorrect password.
 * 3. Validate that the login fails and throws an error due to incorrect
 *    credentials.
 *
 * Ensures that the authentication mechanism correctly denies access for
 * invalid credentials and maintains system security.
 */
export async function test_api_auth_system_admin_login_failure_wrong_password(
  connection: api.IConnection,
) {
  // Step 1: Register a new systemAdmin with a valid email and password
  const validEmail: string = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: validEmail,
    password: validPassword,
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const joinedAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(joinedAdmin);

  // Step 2: Attempt login with correct email but wrong password
  const wrongPassword = validPassword + "1"; // deliberately incorrect
  const loginBody = {
    email: validEmail,
    password: wrongPassword,
  } satisfies INotificationWorkflowSystemAdmin.IRequestLogin;

  // Step 3: Validate that login throws error due to wrong password
  await TestValidator.error(
    "systemAdmin login should fail with wrong password",
    async () => {
      await api.functional.auth.systemAdmin.login(connection, {
        body: loginBody,
      });
    },
  );
}
