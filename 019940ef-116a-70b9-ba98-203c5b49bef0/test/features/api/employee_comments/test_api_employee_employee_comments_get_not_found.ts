import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";

export async function test_api_employee_employee_comments_get_not_found(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an employee for authorization
  const employeeCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employeeAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employeeAuthorized);

  // 2. Attempt to retrieve employee comment by invalid/non-existent ID
  // Generate random UUID that likely does not exist
  const invalidId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "retrieving employee comment with non-existent ID should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.employeeComments.at(
        connection,
        {
          id: invalidId,
        },
      );
    },
  );
}
