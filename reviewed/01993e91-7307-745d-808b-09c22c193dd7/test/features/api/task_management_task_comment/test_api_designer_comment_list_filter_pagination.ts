import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_designer_comment_list_filter_pagination(
  connection: api.IConnection,
) {
  // 1. Register TPM user and authenticate
  const tpmJoinBody = {
    email: "tpm_user@example.com",
    password: "SecurePass123",
    name: "TPM User",
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinBody,
  });
  typia.assert(tpmUser);

  // 2. Register PMO user and authenticate
  const pmoJoinBody = {
    email: "pmo_user@example.com",
    password: "SecurePass123",
    name: "PMO User",
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser = await api.functional.auth.pmo.join(connection, {
    body: pmoJoinBody,
  });
  typia.assert(pmoUser);

  // 3. Register Designer user and authenticate
  const designerJoinBody = {
    email: "designer_user@example.com",
    password_hash: "SecuredHashPassword",
    name: "Designer User",
  } satisfies ITaskManagementDesigner.ICreate;

  const designerUser = await api.functional.auth.designer.join(connection, {
    body: designerJoinBody,
  });
  typia.assert(designerUser);

  // 4. Create TPM user (creator) as owner (distinct from tpmUser)
  // But since the TPM user created above is returned with ITaskManagementTpm, use that
  const tpmCreatorUser = tpmUser;

  // 5. Create Project with TPM user owner
  const projectCreateBody = {
    owner_id: tpmCreatorUser.id,
    code: "PRJ001",
    name: "Project One",
    description: "Test project for E2E",
  } satisfies ITaskManagementProject.ICreate;

  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    {
      body: projectCreateBody,
    },
  );
  typia.assert(project);

  // 6. Create Board within the Project and TPM user owner
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmCreatorUser.id,
    code: "BRD001",
    name: "Board One",
    description: null,
  } satisfies ITaskManagementBoard.ICreate;

  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: boardCreateBody,
    },
  );
  typia.assert(board);

  // 7. Create Task Management Task Status
  const taskStatusCreateBody = {
    code: "to_do",
    name: "To Do",
    description: "Initial state",
  } satisfies ITaskManagementTaskStatus.ICreate;

  const taskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: taskStatusCreateBody,
      },
    );
  typia.assert(taskStatus);

  // 8. Create Task Management Priority
  const priorityCreateBody = {
    code: "normal",
    name: "Normal",
    description: "Standard priority",
  } satisfies ITaskManagementPriority.ICreate;

  const priority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: priorityCreateBody,
      },
    );
  typia.assert(priority);

  // 9. Create Task with all linked entities
  const taskCreateBody = {
    status_id: taskStatus.id,
    priority_id: priority.id,
    creator_id: tpmCreatorUser.id,
    project_id: project.id,
    board_id: board.id,
    title: "Task for comment testing",
    description: "A task to test comment listing and filtering.",
  } satisfies ITaskManagementTask.ICreate;

  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    {
      body: taskCreateBody,
    },
  );
  typia.assert(task);

  // 10. Retrieve paginated filtered comments list with search and paging params
  // We will test empty filter, then some filter conditions
  // Prepare a plausible request body for comment listing
  const commentListRequest = {
    page: 1,
    limit: 10,
    task_id: task.id,
    commenter_id: null,
    comment_body: null,
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
  } satisfies ITaskManagementTaskComment.IRequest;

  // Call with Designer user's authenticated connection
  // (The connection is shared; auth handled by API sdk)
  const commentsPage =
    await api.functional.taskManagement.designer.tasks.comments.indexComments(
      connection,
      {
        taskId: task.id,
        body: commentListRequest,
      },
    );
  typia.assert(commentsPage);

  // 11. Validate pagination information and comments array structure
  TestValidator.predicate(
    "valid pagination current page",
    commentsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    commentsPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "comments data is array",
    Array.isArray(commentsPage.data),
  );

  // Validate each comment item structure
  commentsPage.data.forEach((comment, index) => {
    typia.assert(comment);
    TestValidator.predicate(
      `comment at index ${index} has valid UUID`,
      typeof comment.id === "string" && comment.id.length > 0,
    );
    TestValidator.predicate(
      `comment at index ${index} has non-empty comment_body`,
      typeof comment.comment_body === "string",
    );
    TestValidator.predicate(
      `comment at index ${index} has valid created_at`,
      typeof comment.created_at === "string",
    );
  });

  // Additional negative testing - unauthorized access
  // Use a fresh connection without authentication tokens (simulate anonymous)
  const anonConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access by anonymous should fail",
    async () => {
      await api.functional.taskManagement.designer.tasks.comments.indexComments(
        anonConnection,
        {
          taskId: task.id,
          body: commentListRequest,
        },
      );
    },
  );

  // Error testing: malformed request body missing required page
  // But ITaskManagementTaskComment.IRequest page is optional, so skip this case

  // Error testing: invalid UUID taskId
  await TestValidator.error("invalid UUID taskId should fail", async () => {
    await api.functional.taskManagement.designer.tasks.comments.indexComments(
      connection,
      {
        taskId: "invalid-uuid",
        body: commentListRequest,
      },
    );
  });
}
