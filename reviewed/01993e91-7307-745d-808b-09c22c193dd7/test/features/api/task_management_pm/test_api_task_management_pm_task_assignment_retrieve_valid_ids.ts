import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";

/**
 * Test retrieving a specific assignment details for a task by assignment ID
 * in PM context.
 *
 * Steps:
 *
 * 1. Register a PM user with realistic email and name, and password.
 * 2. Login as the registered PM user to authenticate.
 * 3. Generate realistic UUIDs for taskId and assignmentId to simulate existing
 *    entities.
 * 4. Call GET /taskManagement/pm/tasks/{taskId}/assignments/{assignmentId} to
 *    obtain the assignment details.
 * 5. Assert the output includes exact taskId and assignmentId, valid UUIDs for
 *    assigneeId, and a valid ISO date-time for assignedAt.
 * 6. Test that calling with an invalid taskId UUID string results in an error.
 * 7. Test that calling with an invalid assignmentId UUID string results in an
 *    error.
 */
export async function test_api_task_management_pm_task_assignment_retrieve_valid_ids(
  connection: api.IConnection,
) {
  // 1. Register a PM user
  const pmCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "password123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(pmAuthorized);

  // 2. Login as the registered PM user
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmLoggedIn: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(pmLoggedIn);

  // 3. Generate realistic UUIDs for taskId and assignmentId
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const assignmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Retrieve the assignment by taskId and assignmentId
  const assignment: ITaskManagementTaskAssignment =
    await api.functional.taskManagement.pm.tasks.assignments.atTaskAssignment(
      connection,
      {
        taskId: taskId,
        assignmentId: assignmentId,
      },
    );
  typia.assert(assignment);

  // 5. Validate the response data
  TestValidator.equals(
    "assignment taskId matches request",
    assignment.task_id,
    taskId,
  );
  TestValidator.equals(
    "assignment id matches request",
    assignment.id,
    assignmentId,
  );

  // Validate that assigneeId is a valid UUID (just assert type, server guarantees format)
  typia.assert<string & tags.Format<"uuid">>(assignment.assignee_id);

  // Validate assignedAt is ISO date-time format string (typia.assert ensures this)
  typia.assert<string & tags.Format<"date-time">>(assignment.assigned_at);

  // 6. Error test: invalid taskId format
  await TestValidator.error("error on invalid taskId UUID format", async () => {
    await api.functional.taskManagement.pm.tasks.assignments.atTaskAssignment(
      connection,
      {
        taskId: "invalid-uuid-task",
        assignmentId: assignmentId,
      },
    );
  });

  // 7. Error test: invalid assignmentId format
  await TestValidator.error(
    "error on invalid assignmentId UUID format",
    async () => {
      await api.functional.taskManagement.pm.tasks.assignments.atTaskAssignment(
        connection,
        {
          taskId: taskId,
          assignmentId: "invalid-uuid-assignment",
        },
      );
    },
  );
}
