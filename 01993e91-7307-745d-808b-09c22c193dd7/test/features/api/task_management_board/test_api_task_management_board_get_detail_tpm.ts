import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test retrieving a board detail.
 *
 * This test validates the end-to-end functionality of authenticating a TPM
 * user, creating a project by the TPM user, creating a board under that
 * project owned by the same user, and retrieving detailed information about
 * the board.
 *
 * Steps:
 *
 * 1. Join a new TPM user.
 * 2. Create a project owned by this TPM user.
 * 3. Create a board associated with the project and TPM user.
 * 4. Retrieve the board detailed info by projectId and boardId.
 * 5. Assert that the retrieved board matches the created board in all relevant
 *    fields.
 *
 * Validations include ensuring type safety, response structure, UUID
 * formatting, and the proper business data relationships.
 *
 * This test demonstrates realistic workflow of TPM user interacting with
 * the service and validates the GET
 * /taskManagement/tpm/projects/{projectId}/boards/{boardId} endpoint
 * behavior.
 */
export async function test_api_task_management_board_get_detail_tpm(
  connection: api.IConnection,
) {
  // 1. TPM user joins (registers)
  const tpmJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "TestPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinBody,
  });
  typia.assert(tpmUser);

  // 2. Create a project with TPM user as owner
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementProject.ICreate;

  const project = await api.functional.taskManagement.pmo.projects.create(
    connection,
    {
      body: projectCreateBody,
    },
  );
  typia.assert(project);

  // 3. Create a board under the project owned by TPM user
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: boardCreateBody,
    },
  );
  typia.assert(board);

  // 4. Retrieve the board detail
  const boardDetail =
    await api.functional.taskManagement.tpm.projects.boards.atBoardInProject(
      connection,
      {
        projectId: project.id,
        boardId: board.id,
      },
    );
  typia.assert(boardDetail);

  // 5. Validate that retrieved board details match created board
  TestValidator.equals("board.id should match", boardDetail.id, board.id);
  TestValidator.equals(
    "board.project_id should match",
    boardDetail.project_id,
    project.id,
  );
  TestValidator.equals(
    "board.owner_id should match",
    boardDetail.owner_id,
    tpmUser.id,
  );
  TestValidator.equals(
    "board.code should match",
    boardDetail.code,
    boardCreateBody.code,
  );
  TestValidator.equals(
    "board.name should match",
    boardDetail.name,
    boardCreateBody.name,
  );
  TestValidator.equals(
    "board.description should match",
    boardDetail.description,
    boardCreateBody.description,
  );
}
