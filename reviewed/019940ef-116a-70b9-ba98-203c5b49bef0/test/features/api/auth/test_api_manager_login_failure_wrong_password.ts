import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test login failure scenario for a manager user when providing an
 * incorrect password.
 *
 * This test performs the following steps:
 *
 * 1. Creates a new manager user using the join endpoint with a valid email,
 *    password, and name.
 * 2. Attempts to log in with the email from step 1 but with an incorrect
 *    password.
 *
 * The test validates that the login attempt with wrong password fails with
 * an error, and no authorized token is issued.
 *
 * This is important for security to prevent unauthorized access.
 *
 * The test uses the actual API calls and asserts proper behavior:
 *
 * - Successful joining returns a valid authorized manager including token
 *   info.
 * - Login with incorrect password throws an error.
 */
export async function test_api_manager_login_failure_wrong_password(
  connection: api.IConnection,
) {
  // Step 1: Create a new manager user
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const managerPassword = "correct-password";
  const managerName: string = RandomGenerator.name(2);

  const authorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: managerName,
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(authorized);

  // Step 2: Attempt login with incorrect password
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.auth.manager.login(connection, {
      body: {
        email: managerEmail,
        password: "wrong-password",
      } satisfies IJobPerformanceEvalManager.ILogin,
    });
  });
}
