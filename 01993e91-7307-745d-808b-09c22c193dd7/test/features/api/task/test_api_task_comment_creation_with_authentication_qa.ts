import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates the entire flow of comment creation on a task by
 * a QA user.
 *
 * It executes complete entity setup including TPM user registration/login,
 * creation of TaskStatus, Priority, Project, Board, and Task entities.
 *
 * A QA user is registered and logged in, and creates a comment on the task.
 *
 * The test verifies successful API calls, proper data associations, type
 * safety via typia.assert, and role-based authentication.
 *
 * Both success and failure scenarios are tested to ensure authorization
 * handling and error conditions.
 *
 * Steps:
 *
 * 1. TPM user join & login
 * 2. QA user join & login
 * 3. Create TaskStatus
 * 4. Create Priority
 * 5. Create Project referencing TPM user
 * 6. Create Board under Project
 * 7. Create Task referencing above entities
 * 8. QA user creates comment on Task
 * 9. Assert outputs and cross-reference IDs
 * 10. Test failure when unauthorized or invalid inputs used
 */
export async function test_api_task_comment_creation_with_authentication_qa(
  connection: api.IConnection,
) {
  // 1. TPM user registration and login
  const tpmJoinBody = {
    email: `tpm_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: `P@ssw0rd${RandomGenerator.alphaNumeric(4)}`,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinBody,
  });
  typia.assert(tpmUser);

  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmAuth = await api.functional.auth.tpm.login(connection, {
    body: tpmLoginBody,
  });
  typia.assert(tpmAuth);

  // 2. QA user registration and login
  const qaPlainPassword = `P@ssw0rd${RandomGenerator.alphaNumeric(4)}`;
  // For testing, we simulate password_hash field as the same plain password
  const qaJoinBody = {
    email: `qa_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: qaPlainPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const qaUser = await api.functional.auth.qa.join(connection, {
    body: qaJoinBody,
  });
  typia.assert(qaUser);

  const qaLoginBody = {
    email: qaJoinBody.email,
    password: qaPlainPassword,
  } satisfies ITaskManagementQa.ILogin;
  const qaAuth = await api.functional.auth.qa.login(connection, {
    body: qaLoginBody,
  });
  typia.assert(qaAuth);

  // 3. Create Task Status
  const statusCode = `status_${RandomGenerator.alphaNumeric(6)}`;
  const taskStatusCreateBody = {
    code: statusCode,
    name: `Status ${RandomGenerator.name(1)}`,
    description: `Status description ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: taskStatusCreateBody,
      },
    );
  typia.assert(taskStatus);

  // 4. Create Task Priority
  const priorityCode = `priority_${RandomGenerator.alphaNumeric(6)}`;
  const taskPriorityCreateBody = {
    code: priorityCode,
    name: `Priority ${RandomGenerator.name(1)}`,
    description: `Priority description ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: taskPriorityCreateBody,
      },
    );
  typia.assert(taskPriority);

  // 5. Create Project owned by TPM user
  const projectCode = `project_${RandomGenerator.alphaNumeric(6)}`;
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: projectCode,
    name: `Project ${RandomGenerator.name(1)}`,
    description: `Project description ${RandomGenerator.paragraph({ sentences: 4 })}`,
  } satisfies ITaskManagementProject.ICreate;
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    {
      body: projectCreateBody,
    },
  );
  typia.assert(project);

  // 6. Create Board under Project with TPM user as owner
  const boardCode = `board_${RandomGenerator.alphaNumeric(6)}`;
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: boardCode,
    name: `Board ${RandomGenerator.name(1)}`,
    description: `Board description ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies ITaskManagementBoard.ICreate;
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: boardCreateBody,
    },
  );
  typia.assert(board);

  // 7. Create Task referencing above entities
  const taskCreateBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: `Task Title ${RandomGenerator.paragraph({ sentences: 2 })}`,
    description: `Task description ${RandomGenerator.content({ paragraphs: 1 })}`,
    status_name: taskStatus.name,
    priority_name: taskPriority.name,
    due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  } satisfies ITaskManagementTask.ICreate;
  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    {
      body: taskCreateBody,
    },
  );
  typia.assert(task);

  // Ensure cross-reference correctness
  TestValidator.equals("task status id", task.status_id, taskStatus.id);
  TestValidator.equals("task priority id", task.priority_id, taskPriority.id);
  TestValidator.equals("task project id", task.project_id, project.id);
  TestValidator.equals("task board id", task.board_id, board.id);
  TestValidator.equals("task creator id", task.creator_id, tpmUser.id);

  // 8. QA user creates comment on task
  const commentCreateBody = {
    task_id: task.id,
    commenter_id: qaUser.id,
    comment_body: `Comment body ${RandomGenerator.paragraph({ sentences: 2 })}`,
  } satisfies ITaskManagementTaskComment.ICreate;
  const comment = await api.functional.taskManagement.qa.tasks.comments.create(
    connection,
    {
      taskId: task.id,
      body: commentCreateBody,
    },
  );
  typia.assert(comment);

  // Validate comment references
  TestValidator.equals("comment task id", comment.task_id, task.id);
  TestValidator.equals("comment commenter id", comment.commenter_id, qaUser.id);

  // 9. Failure scenario: unauthorized comment creation (simulate by unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized comment creation should fail",
    async () => {
      await api.functional.taskManagement.qa.tasks.comments.create(
        unauthenticatedConnection,
        {
          taskId: task.id,
          body: commentCreateBody,
        },
      );
    },
  );

  // 10. Failure scenario: invalid task id
  await TestValidator.error(
    "comment creation with invalid task id should fail",
    async () => {
      await api.functional.taskManagement.qa.tasks.comments.create(connection, {
        taskId: typia.random<string & tags.Format<"uuid">>(), // Random unrelated UUID
        body: commentCreateBody,
      });
    },
  );
}
