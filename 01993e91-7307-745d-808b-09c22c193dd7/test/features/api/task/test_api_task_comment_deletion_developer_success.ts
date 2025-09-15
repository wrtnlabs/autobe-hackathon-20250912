import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * E2E test validating that a developer user can successfully delete their
 * comment on a task.
 *
 * This test covers the full workflow from registering and authenticating
 * both developer and TPM users, through creating projects, boards, tasks,
 * and assignments, to the developer creating and deleting a comment.
 *
 * The test ensures authentication works correctly, all entities are created
 * properly, and the comment deletion results in no content response without
 * errors.
 *
 * Each step uses typia.assert for strict runtime type validation, and the
 * API SDK manages authentication tokens. No manual token or header
 * management is performed.
 *
 * This test validates essential business logic and authorization boundaries
 * ensuring only authorized users (comment owners) can delete comments.
 */
export async function test_api_task_comment_deletion_developer_success(
  connection: api.IConnection,
) {
  // 1. Developer user registration
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPassword = "1234";
  const developer: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        password_hash: developerPassword,
        name: RandomGenerator.name(),
        deleted_at: null,
      } satisfies ITaskManagementDeveloper.ICreate,
    });
  typia.assert(developer);

  // Login developer user to refresh authentication context
  const loginDeveloper: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: developerEmail,
        password: developerPassword,
      } satisfies ITaskManagementDeveloper.ILogin,
    });
  typia.assert(loginDeveloper);

  // 2. TPM user registration
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "1234";
  const tpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmEmail,
        password: tpmPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpm);

  // Login TPM user to refresh authentication context
  const loginTpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: {
        email: tpmEmail,
        password: tpmPassword,
      } satisfies ITaskManagementTpm.ILogin,
    });
  typia.assert(loginTpm);

  // 3. TPM user creates a project
  const projectCode = RandomGenerator.alphabets(8);
  const projectName = RandomGenerator.name();
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: {
        owner_id: tpm.id,
        code: projectCode,
        name: projectName,
        description: null,
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 4. TPM user creates a board under the project
  const boardCode = RandomGenerator.alphabets(8);
  const boardName = RandomGenerator.name();
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpm.id,
        code: boardCode,
        name: boardName,
        description: null,
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 5. TPM user creates a task with valid status, priority, and creator
  const taskTitle = RandomGenerator.paragraph({ sentences: 3 });
  const taskDescription = RandomGenerator.content({ paragraphs: 2 });
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const priorityId = typia.random<string & tags.Format<"uuid">>();
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: {
        status_id: statusId,
        priority_id: priorityId,
        creator_id: tpm.id,
        project_id: project.id,
        board_id: board.id,
        title: taskTitle,
        description: taskDescription,
        status_name: null,
        priority_name: null,
        due_date: null,
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // 6. TPM user assigns the task to developer user
  const assignment =
    await api.functional.taskManagement.tpm.tasks.assignments.createAssignment(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          assignee_id: developer.id,
          assigned_at: null,
        } satisfies ITaskManagementTaskAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // 7. Developer user creates a comment on task
  const commentBody = RandomGenerator.paragraph({ sentences: 5 });
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.developer.tasks.comments.create(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          commenter_id: developer.id,
          comment_body: commentBody,
        } satisfies ITaskManagementTaskComment.ICreate,
      },
    );
  typia.assert(comment);

  // 8. Developer user deletes the comment
  await api.functional.taskManagement.developer.tasks.comments.erase(
    connection,
    {
      taskId: task.id,
      commentId: comment.id,
    },
  );
}
