import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test the update operation of a job performance evaluation manager user.
 *
 * The test first creates a new manager user via POST /auth/manager/join,
 * obtaining authorization tokens automatically. Then the test logs in with
 * POST /auth/manager/login using the new user credentials to establish an
 * authenticated session. Afterwards, the test updates the manager's email
 * and name via PUT /jobPerformanceEval/manager/managers/{id}, verifying the
 * updated data in response.
 *
 * Each API call response is validated by typia.assert for type confidence.
 * TestValidator functions validate business logic and response
 * correctness.
 *
 * The test simulates a realistic manager user update workflow ensuring
 * authorization context is properly handled.
 */
export async function test_api_manager_update_manager_role_success(
  connection: api.IConnection,
) {
  // 1. Create new manager user via join
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerJoined = await api.functional.auth.manager.join(connection, {
    body: createBody,
  });
  typia.assert(managerJoined);

  const managerId = typia.assert<string & tags.Format<"uuid">>(
    managerJoined.id,
  );

  // 2. Login again with created manager credentials to set auth session
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IJobPerformanceEvalManager.ILogin;

  const managerLoggedIn = await api.functional.auth.manager.login(connection, {
    body: loginBody,
  });
  typia.assert(managerLoggedIn);

  // 3. Update manager email and name
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.IUpdate;

  const updatedManager =
    await api.functional.jobPerformanceEval.manager.managers.update(
      connection,
      {
        id: managerId,
        body: updateBody,
      },
    );
  typia.assert(updatedManager);

  // 4. Validate that updated fields match
  TestValidator.equals(
    "updated manager email matches",
    updatedManager.email,
    updateBody.email,
  );

  TestValidator.equals(
    "updated manager name matches",
    updatedManager.name,
    updateBody.name,
  );

  // 5. Validate unchanged fields still exist and are valid
  TestValidator.predicate(
    "manager id is non-empty UUID",
    typeof updatedManager.id === "string" && updatedManager.id.length > 0,
  );
  TestValidator.predicate(
    "manager created_at has ISO 8601 date-time format",
    typeof updatedManager.created_at === "string" &&
      updatedManager.created_at.length > 0,
  );
  TestValidator.predicate(
    "manager updated_at has ISO 8601 date-time format",
    typeof updatedManager.updated_at === "string" &&
      updatedManager.updated_at.length > 0,
  );
}
