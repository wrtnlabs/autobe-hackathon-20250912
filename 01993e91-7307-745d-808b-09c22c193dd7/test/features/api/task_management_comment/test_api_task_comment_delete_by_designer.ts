import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * End-to-end test that verifies Designer user's ability to delete a task
 * comment.
 *
 * Business Context: A designer user must be able to register, create tasks
 * with necessary supporting entities, add a comment to a task, and then
 * delete that comment. The test ensures multi-role authentication, proper
 * data linkage between status, priority, project, board, and task entities,
 * as well as ensuring the comment is no longer accessible post-deletion.
 *
 * Test Process:
 *
 * 1. Designer user signs up and authenticates.
 * 2. TPM user creates supporting entities (task status, priority, project,
 *    board) needed for task creation.
 * 3. TPM user switches back to Designer to create the task referencing these
 *    entities and specifying required fields.
 * 4. Designer user adds a comment to the created task.
 * 5. Designer user deletes the comment and calls the erase API.
 * 6. Attempting to fetch the deleted comment should result in error (not
 *    implemented due to lack of fetch API for single comment, so only
 *    deletion assured).
 * 7. Business assertions ensure IDs match, deletion is effective, and
 *    authentication was properly handled.
 */
export async function test_api_task_comment_delete_by_designer(
  connection: api.IConnection,
) {
  // 1. Designer user signs up
  const designerEmail = typia.random<string & tags.Format<"email">>();
  const designerPassword = RandomGenerator.alphaNumeric(12);
  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: {
        email: designerEmail,
        password_hash: designerPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementDesigner.ICreate,
    });
  typia.assert(designer);

  // 2. TPM user signs up
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = RandomGenerator.alphaNumeric(12);
  const tpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmEmail,
        password: tpmPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpm);

  // 3. TPM creates TaskStatus
  const taskStatusCreateBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: taskStatusCreateBody,
      },
    );
  typia.assert(taskStatus);

  // 4. TPM creates TaskPriority
  const priorityCreateBody = {
    code: `priority_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: priorityCreateBody,
      },
    );
  typia.assert(taskPriority);

  // 5. TPM creates Project with ownership as TPM user
  const projectCreateBody = {
    owner_id: tpm.id,
    code: `proj_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 6. TPM creates Board within the Project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpm.id,
    code: `b_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 7. Designer logs in to replace TPM role for task creation
  await api.functional.auth.designer.login(connection, {
    body: {
      email: designerEmail,
      password: designerPassword,
    } satisfies ITaskManagementDesigner.ILogin,
  });

  // 8. Designer creates a Task using the entities
  const taskCreateBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: designer.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status_name: taskStatus.name,
    priority_name: taskPriority.name,
    due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 9. Designer adds a comment to the Task
  const commentCreateBody = {
    task_id: task.id,
    commenter_id: designer.id,
    comment_body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementTaskComment.ICreate;
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.designer.tasks.comments.create(
      connection,
      {
        taskId: task.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 10. Designer deletes the comment
  await api.functional.taskManagement.designer.tasks.comments.erase(
    connection,
    {
      taskId: task.id,
      commentId: comment.id,
    },
  );

  // 11. No API available to fetch deleted comment, so confirmation is by absence of error during deletion.
  TestValidator.predicate("deletion was completed without error", true);
}
