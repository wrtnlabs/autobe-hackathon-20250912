import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * E2E test for retrieving a specific task assignment as an authenticated TPM
 * user.
 *
 * This test performs user registration, login, and retrieves the assignment
 * details for a given task and assignment IDs. It validates success response,
 * data integrity, and error handling for invalid IDs and unauthorized access.
 *
 * Steps:
 *
 * 1. Join as TPM user.
 * 2. Login as TPM user.
 * 3. Retrieve a task assignment using valid IDs.
 * 4. Verify returned data correctness.
 * 5. Test error scenarios including invalid IDs and unauthorized access.
 */
export async function test_api_task_management_tpm_task_assignment_retrieve_valid_ids(
  connection: api.IConnection,
) {
  // 1. Register as TPM user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "1234";
  const name = RandomGenerator.name();
  const joinBody = { email, password, name } satisfies ITaskManagementTpm.IJoin;
  const joinResult: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinBody,
    });
  typia.assert(joinResult);

  // 2. Login with the same user
  const loginBody = { email, password } satisfies ITaskManagementTpm.ILogin;
  const loginResult: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // 3. Generate valid UUIDs
  const validTaskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const validAssignmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Fetch assignment data for valid IDs
  const assignment: ITaskManagementTaskAssignment =
    await api.functional.taskManagement.tpm.tasks.assignments.atTaskAssignment(
      connection,
      {
        taskId: validTaskId,
        assignmentId: validAssignmentId,
      },
    );
  typia.assert(assignment);

  // 5. Validate IDs match
  TestValidator.equals(
    "assignment.task_id matches requested taskId",
    assignment.task_id,
    validTaskId,
  );
  TestValidator.equals(
    "assignment.id matches requested assignmentId",
    assignment.id,
    validAssignmentId,
  );

  // Validate crucial fields presence and types
  typia.assert<string & tags.Format<"uuid">>(assignment.assignee_id);
  typia.assert<string & tags.Format<"date-time">>(assignment.assigned_at);

  // 6a. Error test: invalid taskId format
  await TestValidator.error("invalid taskId should throw error", async () => {
    await api.functional.taskManagement.tpm.tasks.assignments.atTaskAssignment(
      connection,
      {
        taskId: "invalid-uuid-1234" as unknown as string & tags.Format<"uuid">,
        assignmentId: validAssignmentId,
      },
    );
  });

  // 6b. Error test: invalid assignmentId format
  await TestValidator.error(
    "invalid assignmentId should throw error",
    async () => {
      await api.functional.taskManagement.tpm.tasks.assignments.atTaskAssignment(
        connection,
        {
          taskId: validTaskId,
          assignmentId: "invalid-uuid-5678" as unknown as string &
            tags.Format<"uuid">,
        },
      );
    },
  );

  // 6c. Error test: unauthorized access
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access should throw error",
    async () => {
      await api.functional.taskManagement.tpm.tasks.assignments.atTaskAssignment(
        unauthorizedConnection,
        {
          taskId: validTaskId,
          assignmentId: validAssignmentId,
        },
      );
    },
  );
}
