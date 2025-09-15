import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";

/**
 * Test update functionality of task assignments for PM role.
 *
 * This test validates that a PM user can create an account, authenticate,
 * and successfully update a task assignment. Basic response validation and
 * consistency checks on updated fields are performed.
 */
export async function test_api_task_assignment_update_pm_role(
  connection: api.IConnection,
) {
  // 1. Register and authenticate PM user
  const pmCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreate });
  typia.assert(pmUser);

  // 2. Prepare update data for an existing task assignment
  const updatedAssignmentBody = {
    task_id: typia.random<string & tags.Format<"uuid">>(),
    assignee_id: typia.random<string & tags.Format<"uuid">>(),
    assigned_at: new Date().toISOString(),
  } satisfies ITaskManagementTaskAssignment.IUpdate;

  // 3. Perform update API call with random taskId and assignmentId
  const updatedAssignment: ITaskManagementTaskAssignment =
    await api.functional.taskManagement.pm.tasks.assignments.updateAssignment(
      connection,
      {
        taskId: typia.random<string & tags.Format<"uuid">>(),
        assignmentId: typia.random<string & tags.Format<"uuid">>(),
        body: updatedAssignmentBody,
      },
    );
  typia.assert(updatedAssignment);

  // 4. Validate returned data
  TestValidator.predicate(
    "updated assignment id is uuid",
    /^[0-9a-f\-]{36}$/i.test(updatedAssignment.id),
  );
  TestValidator.equals(
    "updated assignment task_id matches or is null",
    updatedAssignment.task_id || null,
    updatedAssignmentBody.task_id || null,
  );
  TestValidator.equals(
    "updated assignment assignee_id matches or is null",
    updatedAssignment.assignee_id || null,
    updatedAssignmentBody.assignee_id || null,
  );
  TestValidator.equals(
    "updated assignment assigned_at matches or is null",
    updatedAssignment.assigned_at || null,
    updatedAssignmentBody.assigned_at || null,
  );
}
