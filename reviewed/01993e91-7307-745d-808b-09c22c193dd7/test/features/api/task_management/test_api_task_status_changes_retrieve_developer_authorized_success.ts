import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";

/**
 * This test covers a complete multi-role workflow for retrieving a specific
 * task status change by a Developer user who is properly authorized.
 *
 * The test proceeds through these steps:
 *
 * 1. Register and authenticate a Developer user, retaining a plain password
 *    for login.
 * 2. Register and authenticate a Project Manager (PM) user.
 * 3. The PM creates a Project.
 * 4. The PM creates a Board within the Project.
 * 5. The PM creates a Task linked to the Project and Board with valid status
 *    and priority IDs.
 * 6. The PM creates a Task Status Change for the created Task.
 * 7. The Developer user re-authenticates with the correct login credentials.
 * 8. The Developer retrieves the specific Task Status Change by ID.
 *
 * Each API response is validated with typia.assert, and the final retrieved
 * status change is compared to the created one to ensure consistency.
 *
 * This test ensures that a Developer user with authorization can
 * successfully access the task status change resource.
 */
export async function test_api_task_status_changes_retrieve_developer_authorized_success(
  connection: api.IConnection,
) {
  // 1. Developer user registers and authenticates
  const developerPlainPassword: string = RandomGenerator.alphaNumeric(12);
  const developerUser: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
        password_hash: developerPlainPassword,
        name: RandomGenerator.name(),
        deleted_at: null,
      } satisfies ITaskManagementDeveloper.ICreate,
    });
  typia.assert(developerUser);

  // 2. PM user registers and authenticates
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(6)}@pmexample.com`,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser);

  // 3. PM creates a Project
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: {
        owner_id: pmUser.id,
        code: `PRJ-${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 4. PM creates a Board within the Project
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: pmUser.id,
        code: `BRD-${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 5. PM creates a Task associated with the Project and Board
  const taskCreateBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: pmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 6. PM creates a Task Status Change for the created Task
  const statusChangeCreateBody = {
    task_id: task.id,
    new_status_id: typia.random<string & tags.Format<"uuid">>(),
    changed_at: new Date().toISOString(),
    comment: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementTaskStatusChange.ICreate;
  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pm.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: statusChangeCreateBody,
      },
    );
  typia.assert(statusChange);

  // 7. Developer user logs in again to authenticate (switch context)
  const developerLogin: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: developerUser.email,
        password: developerPlainPassword,
      } satisfies ITaskManagementDeveloper.ILogin,
    });
  typia.assert(developerLogin);

  // 8. Developer user retrieves the specific Task Status Change by ID
  const retrievedStatusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.developer.tasks.statusChanges.at(
      connection,
      {
        taskId: task.id,
        statusChangeId: statusChange.id,
      },
    );
  typia.assert(retrievedStatusChange);

  // 9. Validate the retrieved status change matches the created one
  TestValidator.equals(
    "retrieved statusChange id matches",
    retrievedStatusChange.id,
    statusChange.id,
  );
  TestValidator.equals(
    "retrieved statusChange task_id matches",
    retrievedStatusChange.task_id,
    statusChange.task_id,
  );
  TestValidator.equals(
    "retrieved statusChange new_status_id matches",
    retrievedStatusChange.new_status_id,
    statusChange.new_status_id,
  );
  TestValidator.equals(
    "retrieved statusChange changed_at matches",
    retrievedStatusChange.changed_at,
    statusChange.changed_at,
  );
  TestValidator.equals(
    "retrieved statusChange comment matches",
    retrievedStatusChange.comment,
    statusChange.comment,
  );
}
