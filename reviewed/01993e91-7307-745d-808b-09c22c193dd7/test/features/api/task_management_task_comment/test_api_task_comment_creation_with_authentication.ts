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

export async function test_api_task_comment_creation_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register new Designer user
  const designerEmail = typia.random<string & tags.Format<"email">>();
  const designerPassword = "Password123!";
  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: {
        email: designerEmail,
        password_hash: designerPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementDesigner.ICreate,
    });
  typia.assert(designer);

  // 2. Login as Designer user
  const designerLogin: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: {
        email: designerEmail,
        password: designerPassword,
      } satisfies ITaskManagementDesigner.ILogin,
    });
  typia.assert(designerLogin);

  // 3. Create TaskStatus for task
  const taskStatusCreateBody: ITaskManagementTaskStatus.ICreate = {
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
  };
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: taskStatusCreateBody,
      },
    );
  typia.assert(taskStatus);

  // 4. Create TaskPriority for task
  const taskPriorityCreateBody: ITaskManagementPriority.ICreate = {
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
  };
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: taskPriorityCreateBody,
      },
    );
  typia.assert(taskPriority);

  // 5. Create a TPM user for project owner - register and login
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "Password123!";
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmEmail,
        password: tpmPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  const tpmLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: {
        email: tpmEmail,
        password: tpmPassword,
      } satisfies ITaskManagementTpm.ILogin,
    });
  typia.assert(tpmLogin);

  // 6. Create Project with TPM user as owner
  const projectCreateBody: ITaskManagementProject.ICreate = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
  };
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 7. Create Board within Project, owned by TPM user
  const boardCreateBody: ITaskManagementBoard.ICreate = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
  };
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 8. Create Task with references
  const taskCreateBody: ITaskManagementTask.ICreate = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: designer.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 6 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
  };
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 9. Create a comment on the task as Designer user
  const commentCreateBody: ITaskManagementTaskComment.ICreate = {
    task_id: task.id,
    commenter_id: designer.id,
    comment_body: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  };
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.designer.tasks.comments.create(
      connection,
      {
        taskId: task.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment is linked with correct task",
    comment.task_id,
    task.id,
  );
  TestValidator.equals(
    "comment is linked with correct commenter",
    comment.commenter_id,
    designer.id,
  );

  // Negative test cases
  // 10. Attempt to create comment with invalid taskId
  await TestValidator.error(
    "create comment with invalid taskId error",
    async () => {
      await api.functional.taskManagement.designer.tasks.comments.create(
        connection,
        {
          taskId: typia.random<string & tags.Format<"uuid">>(), // random invalid ID
          body: commentCreateBody,
        },
      );
    },
  );

  // 11. Attempt unauthorized comment creation by switching to TPM user and trying
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  await TestValidator.error(
    "unauthorized user cannot create comment",
    async () => {
      await api.functional.taskManagement.designer.tasks.comments.create(
        connection,
        {
          taskId: task.id,
          body: {
            task_id: task.id,
            commenter_id: tpmUser.id,
            comment_body: "Unauthorized attempt",
          } satisfies ITaskManagementTaskComment.ICreate,
        },
      );
    },
  );
}
