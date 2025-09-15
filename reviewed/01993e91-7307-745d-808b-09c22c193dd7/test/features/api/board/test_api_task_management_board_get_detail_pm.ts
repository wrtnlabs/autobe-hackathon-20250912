import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test retrieving detailed board information by PM user.
 *
 * This test validates the complete scenario where a PM user authenticates
 * and retrieves detailed information of a board belonging to a project
 * owned by a TPM user.
 *
 * Workflow:
 *
 * 1. Create and authenticate a PM user.
 * 2. Create and authenticate a TPM user who will own a project.
 * 3. Create a project under TPM user.
 * 4. Create a board within the project.
 * 5. Using PM user authentication, retrieve the created board's details via
 *    GET API.
 * 6. Validate that the retrieved board data matches the created board data
 *    exactly.
 */
export async function test_api_task_management_board_get_detail_pm(
  connection: api.IConnection,
) {
  // 1. Create and authenticate PM user
  const pmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pm: ITaskManagementPm.IAuthorized = await api.functional.auth.pm.join(
    connection,
    { body: pmJoinBody },
  );
  typia.assert(pm);

  // 2. Create and authenticate TPM user
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpm);

  // 3. Create a project under TPM user
  const projectCreateBody = {
    owner_id: tpm.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: "Project for E2E Board Detail Testing",
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. Create a board within the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpm.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: "Board for E2E testing",
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 5. Re-authenticate PM user to ensure proper auth context
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmJoinBody.email,
      password: pmJoinBody.password,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 6. PM user retrieves the created board's details via GET API
  const boardReturned: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.atBoardInProject(
      connection,
      {
        projectId: project.id,
        boardId: board.id,
      },
    );
  typia.assert(boardReturned);

  // 7. Validate board data equality
  TestValidator.equals("board.id", boardReturned.id, board.id);
  TestValidator.equals(
    "board.project_id",
    boardReturned.project_id,
    board.project_id,
  );
  TestValidator.equals(
    "board.owner_id",
    boardReturned.owner_id,
    board.owner_id,
  );
  TestValidator.equals("board.code", boardReturned.code, board.code);
  TestValidator.equals("board.name", boardReturned.name, board.name);

  // Compare description carefully as it may be null or undefined
  if (board.description === null || board.description === undefined) {
    TestValidator.equals(
      "board.description",
      boardReturned.description,
      board.description,
    );
  } else {
    if (
      boardReturned.description === null ||
      boardReturned.description === undefined
    ) {
      throw new Error("board.description mismatch: expected non-null value");
    }
    TestValidator.equals(
      "board.description",
      boardReturned.description,
      board.description,
    );
  }

  TestValidator.equals(
    "board.created_at",
    boardReturned.created_at,
    board.created_at,
  );
  TestValidator.equals(
    "board.updated_at",
    boardReturned.updated_at,
    board.updated_at,
  );
  TestValidator.equals(
    "board.deleted_at",
    boardReturned.deleted_at ?? null,
    board.deleted_at ?? null,
  );
}
