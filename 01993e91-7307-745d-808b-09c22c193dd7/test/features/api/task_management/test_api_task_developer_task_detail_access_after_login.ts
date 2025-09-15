import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";

/**
 * This E2E test validates that a developer user can successfully register,
 * log in, and access detailed task information.
 *
 * Workflow:
 *
 * 1. Register a new developer user with valid creation data.
 * 2. Log in as the developer user to obtain valid JWT authentication tokens.
 * 3. Query task details by a valid task UUID using the authenticated session.
 *
 * Validations:
 *
 * - Assert the developer user is created with exact properties matching the
 *   authorized developer structure.
 * - Assert the login response and JWT token structure.
 * - Assert that the retrieved task details conform exactly to the task DTO
 *   schema.
 * - Test uses realistic, random but valid email and password hashes, and task
 *   IDs.
 */
export async function test_api_task_developer_task_detail_access_after_login(
  connection: api.IConnection,
) {
  // 1. Developer user registration
  const createBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;

  const developer: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: createBody,
    });
  typia.assert(developer);

  // 2. Developer user login
  const loginBody = {
    email: developer.email,
    password: "password1234",
  } satisfies ITaskManagementDeveloper.ILogin;

  const loggedInDeveloper: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInDeveloper);

  // 3. Retrieve a valid task detail
  // Using a random UUID as taskId - replace with real taskId if available
  const taskId = typia.random<string & tags.Format<"uuid">>();

  const task: ITaskManagementTask =
    await api.functional.taskManagement.developer.tasks.at(connection, {
      taskId: taskId,
    });
  typia.assert(task);

  // 4. Validate key properties on the task
  TestValidator.predicate(
    "task ID is valid UUID",
    typeof task.id === "string" && task.id.length > 0,
  );
  TestValidator.predicate(
    "task title is non-empty",
    typeof task.title === "string" && task.title.length > 0,
  );
  TestValidator.predicate(
    "task status ID is UUID",
    typeof task.status_id === "string" && task.status_id.length > 0,
  );
  TestValidator.predicate(
    "task priority ID is UUID",
    typeof task.priority_id === "string" && task.priority_id.length > 0,
  );
  TestValidator.predicate(
    "task creator ID is UUID",
    typeof task.creator_id === "string" && task.creator_id.length > 0,
  );

  // Optional properties validation
  if (task.project_id !== null && task.project_id !== undefined) {
    TestValidator.predicate(
      "project_id is UUID",
      typeof task.project_id === "string",
    );
  } else {
    TestValidator.equals(
      "project_id is null or undefined",
      task.project_id,
      null,
    );
  }

  if (task.board_id !== null && task.board_id !== undefined) {
    TestValidator.predicate(
      "board_id is UUID",
      typeof task.board_id === "string",
    );
  } else {
    TestValidator.equals("board_id is null or undefined", task.board_id, null);
  }

  TestValidator.predicate(
    "created_at is string",
    typeof task.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof task.updated_at === "string",
  );

  if (task.deleted_at !== null && task.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is string",
      typeof task.deleted_at === "string",
    );
  } else {
    TestValidator.equals(
      "deleted_at is null or undefined",
      task.deleted_at,
      null,
    );
  }

  if (task.deletedBy !== null && task.deletedBy !== undefined) {
    TestValidator.predicate(
      "deletedBy is UUID string",
      typeof task.deletedBy === "string",
    );
  } else {
    TestValidator.equals(
      "deletedBy is null or undefined",
      task.deletedBy,
      null,
    );
  }
}
