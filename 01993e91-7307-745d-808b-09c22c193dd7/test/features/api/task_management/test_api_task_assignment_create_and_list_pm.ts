import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTaskAssignmentArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignmentArray";

/**
 * End-to-end test for task assignment creation and listing as a Project
 * Manager user.
 *
 * This test covers:
 *
 * - PM user registration and login
 * - Project and board creation
 * - Task creation with proper references
 * - Assignment creation to a TPM user
 * - Listing of task assignments with assertion
 *
 * It validates that workflow and permissions for PM role work correctly.
 */
export async function test_api_task_assignment_create_and_list_pm(
  connection: api.IConnection,
) {
  // 1. PM user registration (join)
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmUser);

  // 2. PM user login
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmUserLogin: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(pmUserLogin);

  // 3. Create a project owned by the PM user
  const projectCreateBody = {
    owner_id: pmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. Create a board under the created project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: pmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 5. Create a task assigned to the project and board
  // Since status_id and priority_id are UUID strings referring to enums,
  // we generate valid UUID strings. Description is optional.
  const taskCreateBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: pmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies ITaskManagementTask.ICreate;

  const task: ITaskManagementTask =
    await api.functional.taskManagement.pm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 6. Create a new assignment for the task
  // TPM assignee_id is mocked as a valid UUID since creation API for TPM user is not provided
  const tpmAssigneeId = typia.random<string & tags.Format<"uuid">>();

  const assignmentCreateBody = {
    task_id: task.id,
    assignee_id: tpmAssigneeId,
  } satisfies ITaskManagementTaskAssignment.ICreate;

  const assignment: ITaskManagementTaskAssignment =
    await api.functional.taskManagement.pm.tasks.assignments.createAssignment(
      connection,
      {
        taskId: task.id,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);

  // 7. List assignments for the task
  const assignments: ITaskManagementTaskAssignmentArray =
    await api.functional.taskManagement.pm.tasks.assignments.indexTaskAssignments(
      connection,
      { taskId: task.id },
    );
  typia.assert(assignments);

  // Validate that the created assignment exists in list
  TestValidator.predicate(
    "assignment list includes created assignment",
    assignments.data.some(
      (item) =>
        item.id === assignment.id &&
        item.assignee_id === assignment.assignee_id &&
        item.task_id === assignment.task_id,
    ),
  );
}
