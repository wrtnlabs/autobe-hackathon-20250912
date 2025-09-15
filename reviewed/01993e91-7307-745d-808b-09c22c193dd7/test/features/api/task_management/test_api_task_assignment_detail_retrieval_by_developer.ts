import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";

/**
 * Test the retrieval of a specific task assignment detail using valid taskId
 * and assignmentId. The test covers authentication as a developer user through
 * join and login endpoints, ensuring proper session establishment before
 * retrieving the assignment detail. Validate that the response correctly
 * contains the matching assignment identified by taskId and assignmentId,
 * including assignee info and assignment timestamp. Validate handling of
 * invalid IDs with appropriate error responses. Validate unauthorized access is
 * denied properly. Edge cases include invalid UUID formats and missing
 * assignments in the database. Success criteria include secure access control,
 * accurate data retrieval, and proper error handling as per business rules.
 */
export async function test_api_task_assignment_detail_retrieval_by_developer(
  connection: api.IConnection,
) {
  // 1. Developer user is registered via join endpoint with generated data
  const developerCreateBody = {
    email: `${RandomGenerator.name(1)}.${RandomGenerator.name(1)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;

  const developerAuthorized: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developerAuthorized);

  // 2. Developer user logs in to get fresh token
  const developerLoginBody = {
    email: developerCreateBody.email,
    password: RandomGenerator.alphaNumeric(10),
  } satisfies ITaskManagementDeveloper.ILogin;

  const developerLogged: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(developerLogged);

  // 3. Generate realistic UUIDs for taskId and assignmentId
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const assignmentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve the assignment detail by taskId and assignmentId
  const assignment: ITaskManagementTaskAssignment =
    await api.functional.taskManagement.developer.tasks.assignments.atTaskAssignment(
      connection,
      { taskId, assignmentId },
    );
  typia.assert(assignment);

  TestValidator.equals(
    "assignment task_id matches request",
    assignment.task_id,
    taskId,
  );
  TestValidator.equals(
    "assignment id matches request",
    assignment.id,
    assignmentId,
  );

  TestValidator.predicate(
    "assignment assigned_at is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      assignment.assigned_at,
    ),
  );

  // 5. Validate error when invalid UUID format passed
  await TestValidator.error(
    "invalid format taskId leads to error",
    async () => {
      await api.functional.taskManagement.developer.tasks.assignments.atTaskAssignment(
        connection,
        { taskId: "invalid-uuid-format", assignmentId },
      );
    },
  );
  await TestValidator.error(
    "invalid format assignmentId leads to error",
    async () => {
      await api.functional.taskManagement.developer.tasks.assignments.atTaskAssignment(
        connection,
        { taskId, assignmentId: "invalid-uuid" },
      );
    },
  );

  // 6. Validate error on non-existent assignment
  const nonExistentTaskId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentAssignmentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "non-existent assignment produces error",
    async () => {
      await api.functional.taskManagement.developer.tasks.assignments.atTaskAssignment(
        connection,
        { taskId: nonExistentTaskId, assignmentId: nonExistentAssignmentId },
      );
    },
  );

  // 7. Validate unauthorized access is denied
  // Create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized access denied", async () => {
    await api.functional.taskManagement.developer.tasks.assignments.atTaskAssignment(
      unauthConn,
      { taskId, assignmentId },
    );
  });
}
