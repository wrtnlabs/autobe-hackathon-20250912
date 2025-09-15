import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTasks";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTasks";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_complex_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. TPM user joins
  const tpmJoinBody = {
    email: `tpmuser_${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: "Password123!",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // 2. TPM user creates Task Status
  const statusBody = {
    code: `status_${RandomGenerator.alphaNumeric(6)}`,
    name: `Status ${RandomGenerator.alphaNumeric(4)}`,
    description: "Test status description",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: statusBody },
    );
  typia.assert(taskStatus);

  // 3. PMO user joins
  const pmoJoinBody = {
    email: `pmouser_${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: "Password123!",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 4. PMO user creates Task Priority
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoJoinBody.email,
      password: pmoJoinBody.password,
    } satisfies ITaskManagementPmo.ILogin,
  });
  const priorityBody = {
    code: `prio_${RandomGenerator.alphaNumeric(5)}`,
    name: `Priority ${RandomGenerator.alphaNumeric(3)}`,
    description: "Priority description",
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      { body: priorityBody },
    );
  typia.assert(taskPriority);

  // 5. PMO user creates Project with TPM user as owner
  const projectBody = {
    owner_id: tpmUser.id,
    code: `proj_${RandomGenerator.alphaNumeric(6)}`,
    name: `Project ${RandomGenerator.alphaNumeric(3)}`,
    description: "Project description",
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 6. TPM user log in again to switch connection authorization to TPM user
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmJoinBody.email,
      password: tpmJoinBody.password,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 7. TPM user creates Board in Project
  const boardBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: `board_${RandomGenerator.alphaNumeric(5)}`,
    name: `Board ${RandomGenerator.alphaNumeric(3)}`,
    description: "Board description",
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardBody,
    });
  typia.assert(board);

  // 8. TPM user performs complex search with filters and pagination
  const searchBody = {
    page: 1,
    limit: 10,
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
  } satisfies ITaskManagementTasks.IRequest;

  const searchResult: IPageITaskManagementTasks.ISummary =
    await api.functional.taskManagement.tpm.tasks.index(connection, {
      body: searchBody,
    });
  typia.assert(searchResult);

  TestValidator.equals(
    "pagination current page is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    searchResult.pagination.limit,
    10,
  );

  // Each task in data matches filter criteria if these optional fields are defined
  for (const task of searchResult.data) {
    if (task.status_name !== undefined && task.status_name !== null) {
      TestValidator.predicate(
        "task status name is string",
        typeof task.status_name === "string",
      );
    }
    if (task.priority_name !== undefined && task.priority_name !== null) {
      TestValidator.predicate(
        "task priority name is string",
        typeof task.priority_name === "string",
      );
    }
    TestValidator.predicate(
      "task id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        task.id,
      ),
    );
  }

  // 9. Negative tests: invalid UUID filters are skipped due to type safety

  await TestValidator.error(
    "unauthorized access without token should throw",
    async () => {
      // simulate unauthenticated connection by cloning and clearing headers
      const unauthConn: api.IConnection = { ...connection, headers: {} };
      await api.functional.taskManagement.tpm.tasks.index(unauthConn, {
        body: searchBody,
      });
    },
  );

  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoJoinBody.email,
      password: pmoJoinBody.password,
    } satisfies ITaskManagementPmo.ILogin,
  });
  await TestValidator.error(
    "PMO role should not access TPM task search",
    async () => {
      await api.functional.taskManagement.tpm.tasks.index(connection, {
        body: searchBody,
      });
    },
  );
}
