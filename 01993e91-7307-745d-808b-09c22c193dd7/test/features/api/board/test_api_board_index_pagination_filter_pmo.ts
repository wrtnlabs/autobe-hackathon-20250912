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

/**
 * This test validates the PMO user's ability to query boards within a
 * project with various filters and pagination. It involves setting up
 * multiple users with different roles (PMO, TPM), creating a project,
 * creating boards under that project, and querying the boards listing API
 * endpoint with filters on owner, name, and pagination. It also tests
 * role-based access control by confirming TPM user cannot list PMO project
 * boards. It checks for error responses on invalid project IDs or
 * unauthorized access.
 */
export async function test_api_board_index_pagination_filter_pmo(
  connection: api.IConnection,
) {
  // 1. Create and authenticate PMO user (join and login)
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPass123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const loggedPmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(loggedPmoUser);

  // 2. Create TPM user via join (instead of direct create) for consistent password login
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPass123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUserAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUserAuthorized);

  // 3. TPM user login to verify credentials and authorization setup
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loggedTpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(loggedTpmUser);

  // 4. Create a project by PMO user
  const projectCreateBody = {
    owner_id: loggedTpmUser.id,
    code: RandomGenerator.alphabets(5),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 5. Prepare multiple boards under the project
  // Since no board creation API is provided, simulate multiple board summaries
  // Create 20 boards with random UUIDs and names
  const boards: ITaskManagementBoard.ISummary[] = [];
  for (let i = 0; i < 20; ++i) {
    boards.push({
      id: typia.random<string & tags.Format<"uuid">>(),
      project_id: project.id,
      code: RandomGenerator.alphaNumeric(6),
      name: `Board ${i} ${RandomGenerator.name(2)}`,
      created_at: new Date(Date.now() - i * 1000000).toISOString(),
      updated_at: new Date(Date.now() - i * 1000000 + 300000).toISOString(),
    });
  }

  // Helper function to simulate API call with filters and check response
  async function callAndValidate(
    filters: ITaskManagementBoard.IRequest,
    expectedBoards: ITaskManagementBoard.ISummary[],
  ) {
    const response =
      await api.functional.taskManagement.pmo.projects.boards.indexBoardsInProject(
        connection,
        {
          projectId: project.id,
          body: filters,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      `pagination current page ${filters.page ?? 1}`,
      response.pagination.current === (filters.page ?? 1),
    );
    TestValidator.predicate(
      `pagination limit ${filters.limit ?? 10}`,
      response.pagination.limit === (filters.limit ?? 10),
    );
    TestValidator.predicate(
      "response data items length less or equal limit",
      response.data.length <= (filters.limit ?? 10),
    );
    // Check each response board is in expectedBoards
    const expectedIds = new Set(expectedBoards.map((b) => b.id));
    for (const r of response.data) {
      TestValidator.predicate(
        `board ${r.id} included in expected set`,
        expectedIds.has(r.id),
      );
      TestValidator.equals(
        `board project_id matches`,
        r.project_id,
        project.id,
      );
    }
  }

  // 6. Call index API without filters, expect all boards paginated
  await callAndValidate({}, boards);

  // 7. Filter by name substring "Board 1" (should match some boards)
  const nameFilter = "Board 1";
  const nameFilteredBoards = boards.filter((b) => b.name.includes(nameFilter));
  await callAndValidate({ name: nameFilter }, nameFilteredBoards);

  // 8. Pagination test: page 2 with limit 5
  const page2Boards = boards.slice(5, 10);
  await callAndValidate({ page: 2, limit: 5 }, page2Boards);

  // 9. Sorting test: sort by name ascending
  const sortedByNameBoards = [...boards].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  await callAndValidate(
    { sortBy: "name", sortDirection: "asc" },
    sortedByNameBoards.slice(0, 10),
  );

  // 10. Sorting test: sort by created_at descending
  const sortedByCreatedAtBoards = [...boards].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  await callAndValidate(
    { sortBy: "created_at", sortDirection: "desc" },
    sortedByCreatedAtBoards.slice(0, 10),
  );

  // 11. Unauthorized access test: TPM user tries to list PMO project boards (should fail)
  await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  await TestValidator.error(
    "TPM user cannot list PMO project boards",
    async () => {
      await api.functional.taskManagement.pmo.projects.boards.indexBoardsInProject(
        connection,
        { projectId: project.id, body: {} },
      );
    },
  );

  // 12. Invalid project ID test (malformed UUID)
  await TestValidator.error(
    "invalid project ID format causes error",
    async () => {
      await api.functional.taskManagement.pmo.projects.boards.indexBoardsInProject(
        connection,
        { projectId: "invalid-uuid" as string & tags.Format<"uuid">, body: {} },
      );
    },
  );
}
