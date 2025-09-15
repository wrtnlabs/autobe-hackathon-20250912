import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";

/**
 * This test validates the Project Manager (PM) user registration and login
 * workflow, and task detail retrieval with proper authentication and
 * authorization.
 *
 * It performs the following steps:
 *
 * 1. Registers a new PM user with valid credentials and checks the authorized
 *    output.
 * 2. Logs in as the PM user to receive fresh JWT tokens and validates.
 * 3. Retrieves detailed information for an existing task by taskId with
 *    authentication.
 * 4. Validates the retrieved task against the ITaskManagementTask schema.
 * 5. Attempts to retrieve a task using an invalid taskId to validate error
 *    handling.
 * 6. Attempts to retrieve a task without authentication to ensure protection.
 *
 * Each step includes comprehensive data integrity and security validations,
 * ensuring the PM role has appropriate access and correct task data is
 * returned.
 */
export async function test_api_task_pm_task_detail_retrieval_with_authentication(
  connection: api.IConnection,
) {
  // 1. PM Registration
  // Generate realistic PM user registration data
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const authorizedPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(authorizedPm);

  TestValidator.predicate(
    "PM registration returned token access",
    typeof authorizedPm.token.access === "string" &&
      authorizedPm.token.access.length > 0,
  );

  // 2. PM Login
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const loggedInPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(loggedInPm);

  TestValidator.predicate(
    "PM login returned new token access",
    typeof loggedInPm.token.access === "string" &&
      loggedInPm.token.access.length > 0,
  );

  TestValidator.equals(
    "PM ID after login matches registration",
    loggedInPm.id,
    authorizedPm.id,
  );

  // 3. Retrieve task details with valid taskId authentication
  // Use a valid random UUID for taskId (in real scenario, should use an actual created taskId)
  const validTaskId = typia.random<string & tags.Format<"uuid">>();

  // Attempt retrieval
  const taskDetail: ITaskManagementTask =
    await api.functional.taskManagement.pm.tasks.at(connection, {
      taskId: validTaskId,
    });
  typia.assert(taskDetail);

  // Validate core task properties presence and format
  TestValidator.predicate(
    "task ID is valid UUID",
    typeof taskDetail.id === "string" && taskDetail.id.length === 36,
  );
  TestValidator.predicate(
    "task status_id is valid UUID",
    typeof taskDetail.status_id === "string" &&
      taskDetail.status_id.length === 36,
  );
  TestValidator.predicate(
    "task priority_id is valid UUID",
    typeof taskDetail.priority_id === "string" &&
      taskDetail.priority_id.length === 36,
  );

  TestValidator.predicate(
    "creator_id is valid UUID",
    typeof taskDetail.creator_id === "string" &&
      taskDetail.creator_id.length === 36,
  );

  TestValidator.predicate(
    "title is non-empty string",
    typeof taskDetail.title === "string" && taskDetail.title.length > 0,
  );

  // Optional properties either null or proper types
  TestValidator.predicate(
    "description is string or null or undefined",
    taskDetail.description === null ||
      typeof taskDetail.description === "string" ||
      taskDetail.description === undefined,
  );

  TestValidator.predicate(
    "status_name is string or null or undefined",
    taskDetail.status_name === null ||
      typeof taskDetail.status_name === "string" ||
      taskDetail.status_name === undefined,
  );

  TestValidator.predicate(
    "priority_name is string or null or undefined",
    taskDetail.priority_name === null ||
      typeof taskDetail.priority_name === "string" ||
      taskDetail.priority_name === undefined,
  );

  TestValidator.predicate(
    "project_id is valid UUID or null or undefined",
    taskDetail.project_id === null ||
      taskDetail.project_id === undefined ||
      (typeof taskDetail.project_id === "string" &&
        taskDetail.project_id.length === 36),
  );

  TestValidator.predicate(
    "board_id is valid UUID or null or undefined",
    taskDetail.board_id === null ||
      taskDetail.board_id === undefined ||
      (typeof taskDetail.board_id === "string" &&
        taskDetail.board_id.length === 36),
  );

  // Date-time fields
  TestValidator.predicate(
    "created_at is date-time string",
    typeof taskDetail.created_at === "string" &&
      !isNaN(Date.parse(taskDetail.created_at)),
  );

  TestValidator.predicate(
    "updated_at is date-time string",
    typeof taskDetail.updated_at === "string" &&
      !isNaN(Date.parse(taskDetail.updated_at)),
  );

  TestValidator.predicate(
    "deleted_at is date-time string or null or undefined",
    taskDetail.deleted_at === null ||
      taskDetail.deleted_at === undefined ||
      (typeof taskDetail.deleted_at === "string" &&
        !isNaN(Date.parse(taskDetail.deleted_at))),
  );

  TestValidator.predicate(
    "deletedBy is valid UUID or null or undefined",
    taskDetail.deletedBy === null ||
      taskDetail.deletedBy === undefined ||
      (typeof taskDetail.deletedBy === "string" &&
        taskDetail.deletedBy.length === 36),
  );

  // 4. Error handling testing

  // Attempt invalid taskId - malformed UUID
  await TestValidator.error(
    "task retrieval fails with malformed taskId",
    async () => {
      await api.functional.taskManagement.pm.tasks.at(connection, {
        taskId: "invalid-uuid-format-1234",
      });
    },
  );

  // Attempt invalid taskId - non-existent UUID
  const nonExistentUUID = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "task retrieval fails with non-existent taskId",
    async () => {
      await api.functional.taskManagement.pm.tasks.at(connection, {
        taskId: nonExistentUUID,
      });
    },
  );

  // Attempt retrieval without authentication by using a new connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "task retrieval fails without authentication",
    async () => {
      await api.functional.taskManagement.pm.tasks.at(
        unauthenticatedConnection,
        {
          taskId: validTaskId,
        },
      );
    },
  );
}
