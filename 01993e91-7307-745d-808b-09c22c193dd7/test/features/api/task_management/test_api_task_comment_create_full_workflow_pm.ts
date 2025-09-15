import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";

/**
 * This E2E test function verifies the full workflow for a Project Manager (PM)
 * creating a task comment in a task management system. The test proceeds as
 * follows:
 *
 * 1. Register a new PM user using the authentication join API.
 * 2. Create a new project owned by the PM with unique project code and descriptive
 *    details.
 * 3. Create a new board under the created project with unique board code and
 *    descriptive name.
 * 4. Create a new task within the project and board, specifying status, priority,
 *    creator, title, description, and due date.
 * 5. Add a comment to the created task referencing the PM user as the commenter
 *    with a comment body.
 *
 * Validations assert unique IDs, codes, the correctness of relationships, and
 * proper timestamps. Only successful, realistic data flows are tested, ensuring
 * entity relationship and data integrity correctness.
 */
export async function test_api_task_comment_create_full_workflow_pm(
  connection: api.IConnection,
) {
  // 1. Register new PM user
  const pmCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "password1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pm: ITaskManagementPm.IAuthorized = await api.functional.auth.pm.join(
    connection,
    { body: pmCreateBody },
  );
  typia.assert(pm);

  // Validate PM fields
  TestValidator.predicate(
    "PM ID is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      pm.id,
    ),
  );
  TestValidator.equals("PM email equals input", pm.email, pmCreateBody.email);
  TestValidator.predicate(
    "PM password_hash is present",
    typeof pm.password_hash === "string" && pm.password_hash.length > 0,
  );
  TestValidator.predicate(
    "PM name equals input",
    pm.name === pmCreateBody.name,
  );
  TestValidator.predicate(
    "PM created_at is ISO date-time",
    typeof pm.created_at === "string" && !isNaN(Date.parse(pm.created_at)),
  );
  TestValidator.predicate(
    "PM updated_at is ISO date-time",
    typeof pm.updated_at === "string" && !isNaN(Date.parse(pm.updated_at)),
  );
  TestValidator.predicate(
    "PM token has access token",
    typeof pm.token.access === "string" && pm.token.access.length > 0,
  );
  TestValidator.predicate(
    "PM token has refresh token",
    typeof pm.token.refresh === "string" && pm.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "PM token expired_at is ISO date-time",
    typeof pm.token.expired_at === "string" &&
      !isNaN(Date.parse(pm.token.expired_at)),
  );
  TestValidator.predicate(
    "PM token refreshable_until is ISO date-time",
    typeof pm.token.refreshable_until === "string" &&
      !isNaN(Date.parse(pm.token.refreshable_until)),
  );

  // 2. Create a new project
  const projectCreateBody = {
    owner_id: pm.id,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  TestValidator.equals(
    "Project owner_id matches PM id",
    project.owner_id,
    pm.id,
  );
  TestValidator.predicate(
    "Project code is defined",
    typeof project.code === "string" && project.code.length > 0,
  );
  TestValidator.predicate(
    "Project id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      project.id,
    ),
  );
  TestValidator.predicate(
    "Project created_at is valid ISO date-time",
    typeof project.created_at === "string" &&
      !isNaN(Date.parse(project.created_at)),
  );
  TestValidator.predicate(
    "Project updated_at is valid ISO date-time",
    typeof project.updated_at === "string" &&
      !isNaN(Date.parse(project.updated_at)),
  );

  // 3. Create a board in the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: pm.id,
    code: RandomGenerator.alphaNumeric(5).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  TestValidator.equals(
    "Board project_id matches project id",
    board.project_id,
    project.id,
  );
  TestValidator.equals("Board owner_id matches PM id", board.owner_id, pm.id);
  TestValidator.predicate(
    "Board code is defined",
    typeof board.code === "string" && board.code.length > 0,
  );
  TestValidator.predicate(
    "Board id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      board.id,
    ),
  );
  TestValidator.predicate(
    "Board created_at is valid ISO date-time",
    typeof board.created_at === "string" &&
      !isNaN(Date.parse(board.created_at)),
  );
  TestValidator.predicate(
    "Board updated_at is valid ISO date-time",
    typeof board.updated_at === "string" &&
      !isNaN(Date.parse(board.updated_at)),
  );

  // 4. Create a task within the project and board
  const status_id = typia.random<string & tags.Format<"uuid">>();
  const priority_id = typia.random<string & tags.Format<"uuid">>();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

  const taskCreateBody = {
    status_id: status_id,
    priority_id: priority_id,
    creator_id: pm.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    due_date: dueDate,
  } satisfies ITaskManagementTask.ICreate;

  const task: ITaskManagementTask =
    await api.functional.taskManagement.pm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  TestValidator.equals(
    "Task status_id matches input",
    task.status_id,
    taskCreateBody.status_id,
  );
  TestValidator.equals(
    "Task priority_id matches input",
    task.priority_id,
    taskCreateBody.priority_id,
  );
  TestValidator.equals("Task creator_id matches PM id", task.creator_id, pm.id);
  TestValidator.equals(
    "Task project_id matches project id",
    task.project_id,
    project.id,
  );
  TestValidator.equals(
    "Task board_id matches board id",
    task.board_id,
    board.id,
  );
  TestValidator.equals(
    "Task title matches input",
    task.title,
    taskCreateBody.title,
  );
  TestValidator.equals(
    "Task description matches input",
    task.description,
    taskCreateBody.description,
  );
  TestValidator.equals(
    "Task due_date matches input",
    task.due_date,
    taskCreateBody.due_date,
  );
  TestValidator.predicate(
    "Task created_at is ISO date-time",
    typeof task.created_at === "string" && !isNaN(Date.parse(task.created_at)),
  );
  TestValidator.predicate(
    "Task updated_at is ISO date-time",
    typeof task.updated_at === "string" && !isNaN(Date.parse(task.updated_at)),
  );

  // 5. Create a comment on the created task
  const commentCreateBody = {
    task_id: task.id,
    commenter_id: pm.id,
    comment_body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskComment.ICreate;

  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.pm.tasks.comments.create(connection, {
      taskId: task.id,
      body: commentCreateBody,
    });
  typia.assert(comment);

  TestValidator.equals(
    "Comment task_id matches task id",
    comment.task_id,
    task.id,
  );
  TestValidator.equals(
    "Comment commenter_id matches PM id",
    comment.commenter_id,
    pm.id,
  );
  TestValidator.equals(
    "Comment comment_body matches input",
    comment.comment_body,
    commentCreateBody.comment_body,
  );
  TestValidator.predicate(
    "Comment created_at is ISO date-time",
    typeof comment.created_at === "string" &&
      !isNaN(Date.parse(comment.created_at)),
  );
  TestValidator.predicate(
    "Comment updated_at is ISO date-time",
    typeof comment.updated_at === "string" &&
      !isNaN(Date.parse(comment.updated_at)),
  );
}
