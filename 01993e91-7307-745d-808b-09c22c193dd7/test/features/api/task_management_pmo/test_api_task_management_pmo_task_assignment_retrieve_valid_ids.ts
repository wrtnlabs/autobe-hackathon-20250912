import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";

export async function test_api_task_management_pmo_task_assignment_retrieve_valid_ids(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate PMO user
  const joinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "StrongPassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody });
  typia.assert(pmoUser);

  // Step 2: Login the PMO user for authentication
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;

  const loggedInUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody });
  typia.assert(loggedInUser);

  // Step 3: Prepare valid UUIDs for taskId and assignmentId
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const assignmentId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Retrieve the specific task assignment
  const assignment: ITaskManagementTaskAssignment =
    await api.functional.taskManagement.pmo.tasks.assignments.atTaskAssignment(
      connection,
      { taskId, assignmentId },
    );
  typia.assert(assignment);

  // Step 5: Validate that the returned assignment matches the queried IDs and fields
  TestValidator.equals(
    "taskId matches the requested ID",
    assignment.task_id,
    taskId,
  );
  TestValidator.equals(
    "assignmentId matches the requested ID",
    assignment.id,
    assignmentId,
  );

  TestValidator.predicate(
    "assigneeId is a valid UUID",
    typeof assignment.assignee_id === "string" &&
      /[0-9a-f\-]{36}/i.test(assignment.assignee_id),
  );
  TestValidator.predicate(
    "assignedAt is a valid ISO 8601 date-time string",
    typeof assignment.assigned_at === "string" &&
      !isNaN(Date.parse(assignment.assigned_at)),
  );
}
