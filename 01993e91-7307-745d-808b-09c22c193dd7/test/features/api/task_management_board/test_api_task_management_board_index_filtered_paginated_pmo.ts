import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementBoard";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_management_board_index_filtered_paginated_pmo(
  connection: api.IConnection,
) {
  // 1. Register and authenticate PMO user
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: pmoEmail,
        password: "secret1234",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  // 2. Register and authenticate TPM user
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmEmail,
        password: "secret1234",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  // 3. Create a project owned by TPM user
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: {
        owner_id: tpmUser.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: null, // nullable property explicitly set
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 4. Query boards in the project with pagination and filtering as PMO
  //    Use filtering parameters: page, limit, sortBy, sortDirection,
  //    optionally name and owner_id filters can be null for general listing
  const pageNumber = 1;
  const pageLimit = 10;
  const boardFilter: ITaskManagementBoard.IRequest = {
    page: pageNumber,
    limit: pageLimit,
    sortBy: "created_at",
    sortDirection: "desc",
    name: null,
    owner_id: null,
  };

  const boardPage: IPageITaskManagementBoard.ISummary =
    await api.functional.taskManagement.pmo.projects.boards.indexBoardsInProject(
      connection,
      {
        projectId: project.id,
        body: boardFilter,
      },
    );

  typia.assert(boardPage);

  // Additional validations
  TestValidator.predicate(
    "boardPage data is an array",
    Array.isArray(boardPage.data),
  );
  TestValidator.predicate(
    "pagination records non-negative",
    boardPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    boardPage.pagination.pages >= 0,
  );

  // Validate the pagination properties
  TestValidator.predicate(
    "pagination current page",
    boardPage.pagination.current === pageNumber,
  );
  TestValidator.predicate(
    "pagination limit",
    boardPage.pagination.limit === pageLimit,
  );

  // Validate all boards belong to the project
  for (const board of boardPage.data) {
    typia.assert(board);
    TestValidator.equals(
      "board belongs to project",
      board.project_id,
      project.id,
    );
  }
}
