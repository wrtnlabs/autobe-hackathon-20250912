import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates the update of a task assignment by a TPM user. The
 * test covers the user registration and authentication as TPM, the task
 * assignment update operation with valid IDs and update data, and failure cases
 * such as unauthorized request and invalid UUIDs.
 *
 * Step-by-step process:
 *
 * 1. TPM user registers and authenticates via /auth/tpm/join
 * 2. Simulate existing task ID and assignment ID for update
 * 3. Update the task assignment with altered data
 * 4. Assert the response matches expected updated assignment structure
 * 5. Test unauthorized update attempt with an unauthenticated connection
 * 6. Test invalid UUID input validation error scenarios
 */
export async function test_api_task_assignment_update_tpm_role(
  connection: api.IConnection,
) {
  // 1. TPM user registration and authentication
  const tpmUserEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmUserEmail,
        password: "SecureP@ssword123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  // 2. Simulated existing task and assignment IDs (normally would be created in setup)
  const existingTaskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const existingAssignmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare update payload with different values to simulate an update
  const updatedAssigneeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const newAssignedAt: string & tags.Format<"date-time"> = new Date(
    Date.now() - 1000 * 60 * 60,
  ).toISOString();

  const updateBody = {
    task_id: existingTaskId,
    assignee_id: updatedAssigneeId,
    assigned_at: newAssignedAt,
  } satisfies ITaskManagementTaskAssignment.IUpdate;

  // 4. Perform the update assignment API call
  const updatedAssignment: ITaskManagementTaskAssignment =
    await api.functional.taskManagement.tpm.tasks.assignments.updateAssignment(
      connection,
      {
        taskId: existingTaskId,
        assignmentId: existingAssignmentId,
        body: updateBody,
      },
    );
  typia.assert(updatedAssignment);

  // Validate the updated assignment fields
  TestValidator.equals(
    "Updated assignment has correct id",
    updatedAssignment.id,
    existingAssignmentId,
  );

  TestValidator.equals(
    "Updated assignment has correct task_id",
    updatedAssignment.task_id,
    existingTaskId,
  );

  TestValidator.equals(
    "Updated assignment has correct assignee_id",
    updatedAssignment.assignee_id,
    updatedAssigneeId,
  );

  TestValidator.equals(
    "Updated assignment has correct assigned_at",
    updatedAssignment.assigned_at,
    newAssignedAt,
  );

  // 5. Test unauthorized update with unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Unauthorized update attempt should fail",
    async () => {
      await api.functional.taskManagement.tpm.tasks.assignments.updateAssignment(
        unauthenticatedConnection,
        {
          taskId: existingTaskId,
          assignmentId: existingAssignmentId,
          body: updateBody,
        },
      );
    },
  );

  // 6. Test invalid UUID format for taskId and assignmentId
  await TestValidator.error("Invalid taskId UUID should fail", async () => {
    await api.functional.taskManagement.tpm.tasks.assignments.updateAssignment(
      connection,
      {
        taskId: "invalid-uuid-format",
        assignmentId: existingAssignmentId,
        body: updateBody,
      },
    );
  });

  await TestValidator.error(
    "Invalid assignmentId UUID should fail",
    async () => {
      await api.functional.taskManagement.tpm.tasks.assignments.updateAssignment(
        connection,
        {
          taskId: existingTaskId,
          assignmentId: "invalid-uuid-format",
          body: updateBody,
        },
      );
    },
  );
}
