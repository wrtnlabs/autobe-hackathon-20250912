import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";

/**
 * Test unauthorized access for deleting an employee comment.
 *
 * This test validates that attempting to delete an employee comment without
 * any prior user authentication (join/login) results in a failure due to
 * lack of authorization.
 *
 * The scenario ensures that the endpoint securely rejects deletion requests
 * lacking proper authentication tokens.
 *
 * Steps:
 *
 * 1. Prepare a random UUID representing the employee comment to delete.
 * 2. Call the employee comment delete API without prior join or login.
 * 3. Expect an HttpError due to unauthorized access.
 */
export async function test_api_employee_employee_comments_delete_unauthorized(
  connection: api.IConnection,
) {
  // Generate a random UUID to represent the employee comment id
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete employee comment without user authentication
  await TestValidator.error(
    "deleting employee comment without authentication should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.employeeComments.eraseEmployeeComment(
        connection,
        { id: commentId },
      );
    },
  );
}
