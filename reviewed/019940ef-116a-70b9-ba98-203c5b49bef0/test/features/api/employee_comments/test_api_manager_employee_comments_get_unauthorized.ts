import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test unauthorized access to employee comment details by manager user
 * without login.
 *
 * This test ensures that fetching employee comments with a valid manager
 * role join performed but no login (unauthenticated) is correctly rejected
 * by authorization.
 *
 * Steps:
 *
 * 1. Create a manager account with join operation to fulfill precondition
 * 2. Without performing login, attempt to fetch an employee comment detail
 *    with a random UUID
 * 3. Confirm that the request fails with an authorization error
 *
 * This test validates the security enforcement of the API endpoint ensuring
 * data confidentiality and access control for manager role resources.
 */
export async function test_api_manager_employee_comments_get_unauthorized(
  connection: api.IConnection,
) {
  // 0. Precondition: Create manager user account by join operation
  //    This sets up authentication context for manager role (token storage),
  //    but no login process afterwards, simulating unauthenticated state.
  const managerCreateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager = await api.functional.auth.manager.join(connection, {
    body: managerCreateInput,
  });
  typia.assert(manager);

  // 1. Attempt to fetch employee comment by random UUID without login
  //    Expect authorization failure (HttpError or rejection error)
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "unauthorized access to manager employee comment detail should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.employeeComments.at(
        connection,
        { id: randomCommentId },
      );
    },
  );
}
