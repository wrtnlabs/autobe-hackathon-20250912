import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test that a registered manager can login successfully with correct
 * credentials.
 *
 * Due to the absence of a dedicated login API, the join endpoint is used as
 * both registration and login for this test.
 *
 * This test creates a manager account, then attempts to login by calling
 * join again with the same credentials to verify successful authorization
 * response and JWT token issuance.
 *
 * Login failure scenarios cannot be tested, as no login API is available.
 */
export async function test_api_manager_login_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Create a new manager user with valid data
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass!23",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerAuthorized);

  // 2. Attempt successful login with correct credentials by calling join again
  const managerLoginSuccessful: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerLoginSuccessful);

  TestValidator.equals(
    "login email matches created email",
    managerLoginSuccessful.email,
    managerCreateBody.email,
  );

  TestValidator.predicate(
    "login token access exists",
    typeof managerLoginSuccessful.token?.access === "string" &&
      managerLoginSuccessful.token.access.length > 0,
  );
}
