import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatusChange";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validate end-to-end workflow for querying task status changes paginated by
 * taskId.
 *
 * The test covers:
 *
 * - Multi-role user registration and authentication (PM and TPM users).
 * - TPM-owned project creation.
 * - Board creation under project owned by TPM.
 * - Task creation under board by PM.
 * - Accessing task status change history via pagination and filters by PM.
 * - Verifying pagination metadata and correctness of returned status changes.
 * - Verifying error on invalid taskId and unauthorized access.
 *
 * This comprehensive test ensures API correctness, role access control, and
 * business rules enforcement.
 */
export async function test_api_task_status_changes_paginated_retrieval_by_taskid(
  connection: api.IConnection,
) {
  // 1. Register and authenticate PM user
  const pmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePMPass123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmJoinBody,
    });
  typia.assert(pmUser);

  // 2. Register and authenticate TPM user
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "secureTPMPass123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmUser);

  // 3. Create a project owned by TPM user
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(10),
    name: `Project_${RandomGenerator.alphaNumeric(5)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. Create a board under project with PM as owner
  const boardCreateBody = {
    project_id: project.id,
    owner_id: pmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: `Board_${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 5. Create a task within board
  const taskCreateBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: pmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: `Task_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 6. Access task status changes via PATCH /taskManagement/pm/tasks/{taskId}/statusChanges
  // Test no filters - empty filter object
  const initialStatusChanges: IPageITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pm.tasks.statusChanges.index(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          page: 1,
          limit: 10,
        } satisfies ITaskManagementTaskStatusChange.IRequest,
      },
    );
  typia.assert(initialStatusChanges);

  TestValidator.predicate(
    "pagination current page is positive",
    initialStatusChanges.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    initialStatusChanges.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    initialStatusChanges.pagination.pages >= 0,
  );

  // Ensure all status changes relate to the taskId
  for (const statusChange of initialStatusChanges.data) {
    TestValidator.equals(
      "statusChange.task_id matches task id",
      statusChange.task_id,
      task.id,
    );
    typia.assert(statusChange);
  }

  // 7. Test invalid taskId error handling
  await TestValidator.error("invalid taskId returns error", async () => {
    await api.functional.taskManagement.pm.tasks.statusChanges.index(
      connection,
      {
        taskId: typia.random<string & tags.Format<"uuid">>(), // random invalid not associated task
        body: {
          task_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 5,
        } satisfies ITaskManagementTaskStatusChange.IRequest,
      },
    );
  });

  // 8. Test unauthorized access behavior
  // Log in as TPM user
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmJoinBody.email,
      password: tpmJoinBody.password,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // TPM user tries to get PM task status changes - should error
  await TestValidator.error("unauthorized TPM access denied", async () => {
    await api.functional.taskManagement.pm.tasks.statusChanges.index(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          page: 1,
          limit: 5,
        } satisfies ITaskManagementTaskStatusChange.IRequest,
      },
    );
  });

  // Log back in as PM to reset
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmJoinBody.email,
      password: pmJoinBody.password,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 9. Test pagination boundary: requesting page 2
  const page2StatusChanges: IPageITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pm.tasks.statusChanges.index(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          page: 2,
          limit: 5,
        } satisfies ITaskManagementTaskStatusChange.IRequest,
      },
    );
  typia.assert(page2StatusChanges);
  TestValidator.predicate(
    "pagination current page is 2",
    page2StatusChanges.pagination.current === 2,
  );

  // 10. Test limit boundary: requesting 1 item per page
  const limit1StatusChanges: IPageITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pm.tasks.statusChanges.index(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          page: 1,
          limit: 1,
        } satisfies ITaskManagementTaskStatusChange.IRequest,
      },
    );
  typia.assert(limit1StatusChanges);
  TestValidator.predicate(
    "pagination limit is 1",
    limit1StatusChanges.pagination.limit === 1,
  );

  // Verify task_id matches
  for (const sc of limit1StatusChanges.data) {
    TestValidator.equals(
      "statusChange.task_id matches task id (limit1)",
      sc.task_id,
      task.id,
    );
  }
}
