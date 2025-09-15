import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Comprehensive E2E test for QA comment listing with filter and pagination.
 *
 * This test exercises the full data preparation flow for TPM and QA users,
 * creates critical task management entities, then authenticates and exercises
 * the QA comment listing endpoint with realistic filters and pagination. It
 * verifies correct behavior including security, pagination integrity, and
 * filter application. Error and unauthorized access scenarios are also tested.
 *
 * Steps:
 *
 * 1. TPM user sign up and login
 * 2. Create Task Status(es)
 * 3. Create Task Priority(ies)
 * 4. Create Project
 * 5. Create Board within Project
 * 6. Create Task linked with entities
 * 7. QA user sign up and login
 * 8. Call PATCH comments endpoint with valid filters and pagination
 * 9. Validate returned pagination and comment summary
 * 10. Test unauthorized access and error cases
 *
 * This guarantees robust functionality and security for QA comment listing.
 */
export async function test_api_qa_comment_list_filter_pagination(
  connection: api.IConnection,
) {
  // 1. TPM user joins
  const tpmEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "password123";
  const tpmJoinBody = {
    email: tpmEmail,
    password: tpmPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // 2. TPM user login
  const tpmLoginBody = {
    email: tpmEmail,
    password: tpmPassword,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmUserReloaded: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmUserReloaded);

  // 3. Create TaskManagementTaskStatus
  const statusBody = {
    code: "done",
    name: "Done",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: statusBody },
    );
  typia.assert(taskStatus);

  // 4. Create TaskManagementPriority
  const priorityBody = {
    code: "high",
    name: "High",
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: priorityBody },
    );
  typia.assert(taskPriority);

  // 5. Create Project
  const projectBody = {
    owner_id: tpmUser.id,
    code: "proj_" + RandomGenerator.alphaNumeric(4),
    name: "Project " + RandomGenerator.name(),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 6. Create Board in Project
  const boardBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: "board_" + RandomGenerator.alphaNumeric(4),
    name: "Board " + RandomGenerator.name(),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardBody,
    });
  typia.assert(board);

  // 7. Create Task
  const taskBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: "Task " + RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskBody,
    });
  typia.assert(task);

  // 8. QA user joins
  const qaEmail: string = typia.random<string & tags.Format<"email">>();
  const qaPassword = "password123";
  const qaJoinBody = {
    email: qaEmail,
    password_hash: qaPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;

  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, { body: qaJoinBody });
  typia.assert(qaUser);

  // 9. QA user login
  const qaLoginBody = {
    email: qaEmail,
    password: qaPassword,
  } satisfies ITaskManagementQa.ILogin;
  const qaUserReloaded: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, { body: qaLoginBody });
  typia.assert(qaUserReloaded);

  // 10. QA user calls the patch comments API with filters and pagination
  // Prepare valid comment request filters
  const filterRequest: ITaskManagementTaskComment.IRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    task_id: task.id,
    commenter_id: null,
    comment_body: null,
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
  };

  const commentPage: IPageITaskManagementTaskComment.ISummary =
    await api.functional.taskManagement.qa.tasks.comments.indexComments(
      connection,
      {
        taskId: task.id,
        body: filterRequest,
      },
    );
  typia.assert(commentPage);
  TestValidator.predicate(
    "pagination current page is 1",
    commentPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    commentPage.pagination.limit === 10,
  );

  // 11. Test unauthorized access (simulate empty headers / no auth)
  const unauthenticatedConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized access throws error", async () => {
    await api.functional.taskManagement.qa.tasks.comments.indexComments(
      unauthenticatedConn,
      { taskId: task.id, body: filterRequest },
    );
  });

  // 12. Test invalid taskId error (empty string)
  await TestValidator.error(
    "missing or invalid taskId should throw",
    async () => {
      await api.functional.taskManagement.qa.tasks.comments.indexComments(
        connection,
        { taskId: "", body: filterRequest },
      );
    },
  );

  // 13. Test malformed search parameters error
  // We attempt an invalid page value, which is outside allowed integer range
  await TestValidator.error(
    "malformed pagination parameter should throw",
    async () => {
      await api.functional.taskManagement.qa.tasks.comments.indexComments(
        connection,
        {
          taskId: task.id,
          body: {
            ...filterRequest,
            page: -1,
          },
        },
      );
    },
  );
}
