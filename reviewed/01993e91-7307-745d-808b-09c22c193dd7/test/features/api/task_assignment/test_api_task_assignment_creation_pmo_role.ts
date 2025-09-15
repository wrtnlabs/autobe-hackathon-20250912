import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";

/**
 * This E2E test validates that a PMO user can successfully create task
 * assignments
 *
 * The test performs the following steps:
 *
 * 1. Registers a new PMO user by calling /auth/pmo/join.
 * 2. Generates a random UUID as a simulated taskId for task assignment.
 * 3. Creates a valid assignment by assigning the task to a TPM user.
 * 4. Validates the response to ensure the assignment's task_id and assignee_id
 *    match the input.
 * 5. Tests error scenarios including invalid task references, invalid assignee
 *    references, unauthorized access, and duplicate assignments.
 */
export async function test_api_task_assignment_creation_pmo_role(
  connection: api.IConnection,
) {
  // 1. PMO user registration and authentication
  const pmoJoinBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@pmo.example.com`,
    password: "password123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 2. Generate random UUID for taskId (assuming task exists externally)
  const taskId = typia.random<string & tags.Format<"uuid">>();

  // 3. Generate random UUID for assigneeId (TPM user), assumed invalid for error cases
  const assigneeId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create a valid assignment
  const assignmentCreateBody = {
    task_id: taskId,
    assignee_id: assigneeId,
  } satisfies ITaskManagementTaskAssignment.ICreate;

  // First assignment creation - should succeed
  const assignment: ITaskManagementTaskAssignment =
    await api.functional.taskManagement.pmo.tasks.assignments.createAssignment(
      connection,
      { taskId: taskId, body: assignmentCreateBody },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "Assignment task_id matches input",
    assignment.task_id,
    taskId,
  );
  TestValidator.equals(
    "Assignment assignee_id matches input",
    assignment.assignee_id,
    assigneeId,
  );
  TestValidator.predicate(
    "Assignment assigned_at is a non-empty date-time string",
    typeof assignment.assigned_at === "string" &&
      assignment.assigned_at.length > 0,
  );

  // 5. Test invalid task reference: use a valid UUID that likely does not exist
  const invalidTaskId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Should fail for non-existent taskId", async () => {
    await api.functional.taskManagement.pmo.tasks.assignments.createAssignment(
      connection,
      { taskId: invalidTaskId, body: assignmentCreateBody },
    );
  });

  // 6. Test invalid assignee reference: use a valid UUID that likely does not exist
  const invalidAssigneeId = typia.random<string & tags.Format<"uuid">>();
  const invalidAssigneeBody = {
    task_id: taskId,
    assignee_id: invalidAssigneeId,
  } satisfies ITaskManagementTaskAssignment.ICreate;
  await TestValidator.error(
    "Should fail for non-existent assignee_id",
    async () => {
      await api.functional.taskManagement.pmo.tasks.assignments.createAssignment(
        connection,
        { taskId: taskId, body: invalidAssigneeBody },
      );
    },
  );

  // 7. Test unauthorized access using unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Unauthorized access should fail", async () => {
    await api.functional.taskManagement.pmo.tasks.assignments.createAssignment(
      unauthConnection,
      { taskId: taskId, body: assignmentCreateBody },
    );
  });

  // 8. Test duplicate assignment error by creating the same assignment again
  await TestValidator.error("Duplicate assignment should fail", async () => {
    await api.functional.taskManagement.pmo.tasks.assignments.createAssignment(
      connection,
      { taskId: taskId, body: assignmentCreateBody },
    );
  });
}
