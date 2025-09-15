import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_comment_listing_developer_authenticated(
  connection: api.IConnection,
) {
  // 1. Developer user registration and login
  const developerSignupBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@developer.com`,
    password_hash: "P@ssword123",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementDeveloper.ICreate;
  const developer: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerSignupBody,
    });
  typia.assert(developer);

  await api.functional.auth.developer.login(connection, {
    body: {
      email: developerSignupBody.email,
      password: developerSignupBody.password_hash,
    } satisfies ITaskManagementDeveloper.ILogin,
  });

  // 2. TPM user creation
  const tpmSignupBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@tpm.com`,
    password: "P@ssword123",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmSignupBody,
    });
  typia.assert(tpmUser);

  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmSignupBody.email,
      password: tpmSignupBody.password,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 3. Project creation by TPM
  const projectBody = {
    owner_id: tpmUser.id,
    code: `PRJ-${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 4. Board creation within project
  const boardBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: `BRD-${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardBody,
    });
  typia.assert(board);

  // 5. Task creation associated with project and board
  const taskBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskBody,
    });
  typia.assert(task);

  // 6. Create multiple comments on the task by TPM user
  const commentCount = 5;
  const comments: ITaskManagementTaskComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const commentBody = {
      task_id: task.id,
      commenter_id: tpmUser.id,
      comment_body: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ITaskManagementTaskComment.ICreate;
    const comment: ITaskManagementTaskComment =
      await api.functional.taskManagement.tpm.tasks.comments.create(
        connection,
        {
          taskId: task.id,
          body: commentBody,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // 7. Developer user retrieves paginated comment list for the task
  // Switch authentication context to developer
  await api.functional.auth.developer.login(connection, {
    body: {
      email: developerSignupBody.email,
      password: developerSignupBody.password_hash,
    } satisfies ITaskManagementDeveloper.ILogin,
  });

  const listRequestBody = {
    page: 1,
    limit: 10,
    task_id: task.id,
  } satisfies ITaskManagementTaskComment.IRequest;

  const commentsPage: IPageITaskManagementTaskComment.ISummary =
    await api.functional.taskManagement.developer.tasks.comments.indexComments(
      connection,
      {
        taskId: task.id,
        body: listRequestBody,
      },
    );
  typia.assert(commentsPage);

  // Verify pagination data
  TestValidator.predicate(
    "pagination current should be 1",
    commentsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    commentsPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be at least number of comments created",
    commentsPage.pagination.records >= commentCount,
  );

  // Verify the retrieved comments match created comments
  TestValidator.equals(
    "retrieved comments should belong to the task",
    commentsPage.data.every(
      (c) => c.id && comments.some((cm) => cm.id === c.id),
    ),
    true,
  );
  TestValidator.equals(
    "comment bodies retrieved should match created",
    commentsPage.data.map((c) => c.comment_body).sort(),
    comments.map((c) => c.comment_body).sort(),
  );
}
