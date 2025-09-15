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

export async function test_api_task_comment_update_designer_authorized(
  connection: api.IConnection,
) {
  // Register and login as designer user
  const designerEmail: string = typia.random<string & tags.Format<"email">>();
  const designerPassword = RandomGenerator.alphaNumeric(10);
  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: {
        email: designerEmail,
        password_hash: designerPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementDesigner.ICreate,
    });
  typia.assert(designer);

  await api.functional.auth.designer.login(connection, {
    body: {
      email: designerEmail,
      password: designerPassword,
    } satisfies ITaskManagementDesigner.ILogin,
  });

  // Register and login as TPM user
  const tpmEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmPassword = RandomGenerator.alphaNumeric(10);
  const tpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmEmail,
        password: tpmPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpm);

  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // Create task status
  const statusCode = RandomGenerator.alphaNumeric(5);
  const statusName = RandomGenerator.paragraph({ sentences: 3 });
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: statusCode,
          name: statusName,
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(taskStatus);

  // Create task priority
  const priorityCode = RandomGenerator.alphaNumeric(5);
  const priorityName = RandomGenerator.paragraph({ sentences: 3 });
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: priorityCode,
          name: priorityName,
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(taskPriority);

  // Create project
  const projectCode = RandomGenerator.alphaNumeric(5);
  const projectName = RandomGenerator.paragraph({ sentences: 3 });
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: {
        owner_id: tpm.id,
        code: projectCode,
        name: projectName,
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // Create board within project
  const boardCode = RandomGenerator.alphaNumeric(5);
  const boardName = RandomGenerator.paragraph({ sentences: 3 });
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpm.id,
        code: boardCode,
        name: boardName,
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // Create task under TPM user
  const taskTitle = RandomGenerator.paragraph({ sentences: 4 });
  const taskDescription = RandomGenerator.content({ paragraphs: 2 });
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: {
        creator_id: tpm.id,
        status_id: taskStatus.id,
        priority_id: taskPriority.id,
        project_id: project.id,
        board_id: board.id,
        title: taskTitle,
        description: taskDescription,
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // Create initial comment by designer user on task
  const commentBodyInitial = RandomGenerator.paragraph({ sentences: 5 });
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.designer.tasks.comments.create(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          commenter_id: designer.id,
          comment_body: commentBodyInitial,
        } satisfies ITaskManagementTaskComment.ICreate,
      },
    );
  typia.assert(comment);

  // Update the comment
  const commentBodyUpdated = RandomGenerator.paragraph({ sentences: 6 });
  const updatedComment: ITaskManagementTaskComment =
    await api.functional.taskManagement.designer.tasks.comments.update(
      connection,
      {
        taskId: task.id,
        commentId: comment.id,
        body: {
          comment_body: commentBodyUpdated,
        } satisfies ITaskManagementTaskComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Validate that updated comment body matches
  TestValidator.equals(
    "updated comment body matches",
    updatedComment.comment_body,
    commentBodyUpdated,
  );
}
