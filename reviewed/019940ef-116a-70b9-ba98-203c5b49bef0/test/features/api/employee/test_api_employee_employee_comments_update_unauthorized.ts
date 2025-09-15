import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";

/**
 * Validate that trying to update an employee comment without proper
 * employee authentication results in authorization failure.
 *
 * This test attempts to update an employee comment using the
 * updateEmployeeComment API without performing employee join or login
 * first, simulating an unauthorized request.
 *
 * The expected result is an error due to lack of authentication/context.
 *
 * Steps:
 *
 * 1. Prepare a random UUID for the comment id to update.
 * 2. Prepare a valid update body with a comment string.
 * 3. Attempt to call the updateEmployeeComment API with this data on a fresh
 *    connection.
 * 4. Expect the call to fail with authorization error.
 */
export async function test_api_employee_employee_comments_update_unauthorized(
  connection: api.IConnection,
) {
  // Generate a random UUID for employee comment ID
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // Prepare update body with a sample comment
  const updateBody = {
    comment: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IJobPerformanceEvalEmployeeComments.IUpdate;

  // Attempt to update employee comment without prior authentication
  await TestValidator.error(
    "unauthorized update to employee comment should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.employeeComments.updateEmployeeComment(
        connection,
        {
          id: commentId,
          body: updateBody,
        },
      );
    },
  );
}
