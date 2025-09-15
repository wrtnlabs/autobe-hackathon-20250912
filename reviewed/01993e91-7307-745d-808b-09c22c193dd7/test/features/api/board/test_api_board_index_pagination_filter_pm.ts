import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementBoard";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test function validates the PM role user's ability to retrieve
 * filtered and paginated lists of boards within a project.
 *
 * The test workflow is as follows:
 *
 * 1. Create and authenticate a PM user via join and login endpoints.
 * 2. Create a TPM user to assign as the owner of boards.
 * 3. Create a new project owned by the PM user.
 * 4. Use the PM user to retrieve a list of boards under the project with
 *    various pagination, filtering, and sorting requests.
 * 5. Validate correctness of pagination metadata and that filtering by board
 *    name and owner_id works.
 * 6. Test access control by attempting to query boards with invalid project
 *    IDs or unauthorized user.
 */
export async function test_api_board_index_pagination_filter_pm(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a PM user
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pmPassword = RandomGenerator.alphaNumeric(12);
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser);

  // Login the PM user to obtain auth tokens
  const pmLogin: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
      } satisfies ITaskManagementPm.ILogin,
    });
  typia.assert(pmLogin);

  // 2. Create a TPM user to be the owner of boards
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = RandomGenerator.alphaNumeric(12);
  const tpmJoinBody = {
    email: tpmEmail,
    password: tpmPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // Login TPM user to confirm auth (optional but included for demo)
  const tpmLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: {
        email: tpmEmail,
        password: tpmPassword,
      } satisfies ITaskManagementTpm.ILogin,
    });
  typia.assert(tpmLogin);

  // 3. Create a project owned by the PM user
  const projectCreateBody = {
    owner_id: pmUser.id,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: `Project ${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 })}`,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 10,
    }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. Prepare several test request cases for board listing with pagination and filtering
  // Because we have no API to create boards directly, we'll simulate filtered queries and validate structure

  // Base request without filters, with page=1, limit=5
  const baseRequest = {
    page: 1,
    limit: 5,
  } satisfies ITaskManagementBoard.IRequest;

  // Request filtering by name (partial match assumed by backend)
  const filterByNameRequest = {
    name: "board", // Common filter string
    page: 1,
    limit: 5,
    sortBy: "name",
    sortDirection: "asc",
  } satisfies ITaskManagementBoard.IRequest;

  // Request filtering by owner_id (TPM user id)
  const filterByOwnerRequest = {
    owner_id: tpmUser.id,
    page: 1,
    limit: 5,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ITaskManagementBoard.IRequest;

  // 5. Call the indexBoardsInProject API with base request
  const baseResult: IPageITaskManagementBoard.ISummary =
    await api.functional.taskManagement.pm.projects.boards.indexBoardsInProject(
      connection,
      {
        projectId: project.id satisfies string & tags.Format<"uuid">,
        body: baseRequest,
      },
    );
  typia.assert(baseResult);

  TestValidator.predicate(
    "pagination current page is 1",
    baseResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    baseResult.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination pages are positive",
    baseResult.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    baseResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length is at most 5",
    baseResult.data.length <= 5,
  );

  if (baseResult.data.length > 1) {
    // Check sorting if sortBy is specified later
  }

  // 6. Call with filtering by name
  const filterNameResult: IPageITaskManagementBoard.ISummary =
    await api.functional.taskManagement.pm.projects.boards.indexBoardsInProject(
      connection,
      {
        projectId: project.id,
        body: filterByNameRequest,
      },
    );
  typia.assert(filterNameResult);

  // Ensure returned boards' names include filter string case-insensitively
  filterNameResult.data.forEach((board) => {
    TestValidator.predicate(
      `board name contains filter substring 'board'`,
      board.name.toLowerCase().includes("board"),
    );
  });

  // 7. Call with filtering by owner_id
  const filterOwnerResult: IPageITaskManagementBoard.ISummary =
    await api.functional.taskManagement.pm.projects.boards.indexBoardsInProject(
      connection,
      {
        projectId: project.id,
        body: filterByOwnerRequest,
      },
    );
  typia.assert(filterOwnerResult);

  // Ensure returned boards all belong to the project
  filterOwnerResult.data.forEach((board) => {
    TestValidator.equals(
      "board belongs to project",
      board.project_id,
      project.id,
    );
  });

  // 8. Test invalid project id format
  await TestValidator.error(
    "invalid projectId format throws error",
    async () => {
      await api.functional.taskManagement.pm.projects.boards.indexBoardsInProject(
        connection,
        {
          projectId: "invalid-uuid-string" satisfies string &
            tags.Format<"uuid">,
          body: baseRequest,
        },
      );
    },
  );

  // 9. Test unauthorized access by switching to TPM user and querying PM endpoint
  // Login as TPM user
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // Attempt PM boards listing by TPM user - expect error or permission denied
  await TestValidator.error(
    "TPM user forbidden from PM boards listing",
    async () => {
      await api.functional.taskManagement.pm.projects.boards.indexBoardsInProject(
        connection,
        {
          projectId: project.id,
          body: baseRequest,
        },
      );
    },
  );

  // Switch back to PM user for clean-up or further testing
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });
}
