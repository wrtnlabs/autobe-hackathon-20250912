import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test scenario to verify that attempting to fetch a non-existent employee
 * comment by ID while authenticated as a manager results in a 404 not found
 * error.
 *
 * This test includes:
 *
 * 1. Manager account creation and authentication via /auth/manager/join
 *    endpoint.
 * 2. Attempt to fetch a non-existent employee comment using a randomly
 *    generated UUID.
 * 3. Assertion that the request throws an error, specifically a 404 HttpError.
 *
 * The purpose is to validate error handling and permission checking for
 * resource access.
 */
export async function test_api_manager_employee_comments_get_not_found(
  connection: api.IConnection,
) {
  // 1. Create and authenticate manager
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const authorizedManager = await api.functional.auth.manager.join(connection, {
    body: managerCreateBody,
  });
  typia.assert(authorizedManager);

  // 2. Attempt to get non-existent employee comment by ID
  const randomFakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Fetching non-existent employee comment should throw 404 HttpError",
    async () => {
      try {
        await api.functional.jobPerformanceEval.manager.employeeComments.at(
          connection,
          {
            id: randomFakeId,
          },
        );
        throw new Error("Expected HttpError not thrown");
      } catch (exp) {
        if (!(exp instanceof api.HttpError)) throw exp;
        TestValidator.equals("Error status is 404", exp.status, 404);
      }
    },
  );
}
