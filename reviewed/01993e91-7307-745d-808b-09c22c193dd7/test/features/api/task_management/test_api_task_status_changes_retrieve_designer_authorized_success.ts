import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";

/**
 * Validate that a Designer user can successfully retrieve a specific task
 * status change by ID.
 *
 * This test simulates a multi-role environment involving a Designer and a
 * Project Manager (PM). It verifies complete workflow from user
 * registration, project and related entities creation, through to creating
 * and retrieving a task status change.
 *
 * Sequential test steps:
 *
 * 1. Register Designer user.
 * 2. Register PM user.
 * 3. PM user creates a project.
 * 4. PM user creates a board within the project.
 * 5. PM user creates a task linked to the project and board.
 * 6. PM user creates a status change for the task.
 * 7. Designer user logs back in to switch authorization.
 * 8. Designer user retrieves the task status change by its ID.
 *
 * All API responses are validated for correctness and type safety. Test
 * asserts that retrieved data matches created status change.
 */
export async function test_api_task_status_changes_retrieve_designer_authorized_success(
  connection: api.IConnection,
) {
  // 1. Register Designer user
  const designerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;
  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: designerCreateBody,
    });
  typia.assert(designer);

  // 2. Register PM user
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pm: ITaskManagementPm.IAuthorized = await api.functional.auth.pm.join(
    connection,
    { body: pmCreateBody },
  );
  typia.assert(pm);

  // 3. PM creates a project
  const projectCreateBody = {
    owner_id: pm.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. PM creates a board inside the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: pm.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 5. PM creates a task on the project and board
  const taskCreateBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: pm.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 6. PM creates a task status change
  const statusChangeCreateBody = {
    task_id: task.id,
    new_status_id: typia.random<string & tags.Format<"uuid">>(),
    changed_at: new Date().toISOString(),
    comment: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementTaskStatusChange.ICreate;
  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pm.tasks.statusChanges.create(
      connection,
      { taskId: task.id, body: statusChangeCreateBody },
    );
  typia.assert(statusChange);

  // 7. Designer logs in again to switch authorization context
  const designerLoginBody = {
    email: designerCreateBody.email,
    password: designerCreateBody.password_hash,
  } satisfies ITaskManagementDesigner.ILogin;
  const designerLogin: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: designerLoginBody,
    });
  typia.assert(designerLogin);

  // 8. Designer retrieves the status change
  const retrievedStatusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.designer.tasks.statusChanges.at(
      connection,
      { taskId: task.id, statusChangeId: statusChange.id },
    );
  typia.assert(retrievedStatusChange);

  // Verify retrieved status change matches created one
  TestValidator.equals(
    "retrieved status change id equals created",
    retrievedStatusChange.id,
    statusChange.id,
  );
  TestValidator.equals(
    "retrieved status change taskId equals created",
    retrievedStatusChange.task_id,
    statusChange.task_id,
  );
  TestValidator.equals(
    "retrieved status change new_status_id equals created",
    retrievedStatusChange.new_status_id,
    statusChange.new_status_id,
  );
  TestValidator.equals(
    "retrieved status change comment equals created",
    retrievedStatusChange.comment,
    statusChange.comment,
  );
  TestValidator.equals(
    "retrieved status change changed_at equals created",
    retrievedStatusChange.changed_at,
    statusChange.changed_at,
  );
}
