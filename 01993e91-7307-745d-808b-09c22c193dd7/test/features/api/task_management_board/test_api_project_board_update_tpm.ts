import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test verifies the full lifecycle of updating a TPM-managed
 * project board. It includes TPM user registration, authentication, project
 * and board creation, followed by the update operation on the board.
 *
 * The test asserts the correct associations between user, project, and
 * board, validates returned UUIDs and names, and ensures update operations
 * persist changes.
 *
 * All API calls use proper typing with strict type assertions via
 * typia.assert, data generated through RandomGenerator and typia.random
 * with appropriate constraints matching descriptions.
 *
 * Business rule validations and authorization flow are enforced.
 */
export async function test_api_project_board_update_tpm(
  connection: api.IConnection,
) {
  // 1. TPM user registration and authentication
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinBody,
  });
  typia.assert(tpmUser);

  // 2. Create a project owned by the TPM user
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    {
      body: projectCreateBody,
    },
  );
  typia.assert(project);
  TestValidator.predicate(
    "project id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      project.id,
    ),
  );
  TestValidator.equals(
    "project owner id matches TPM user",
    project.owner_id,
    tpmUser.id,
  );

  // 3. Create a board under the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: boardCreateBody,
    },
  );
  typia.assert(board);
  TestValidator.predicate(
    "board id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      board.id,
    ),
  );
  TestValidator.equals(
    "board project id matches created project",
    board.project_id,
    project.id,
  );
  TestValidator.equals(
    "board owner id matches TPM user",
    board.owner_id,
    tpmUser.id,
  );

  // 4. Update the board's name and description
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITaskManagementBoard.IUpdate;
  const updatedBoard =
    await api.functional.taskManagement.tpm.projects.boards.update(connection, {
      projectId: project.id,
      boardId: board.id,
      body: updateBody,
    });
  typia.assert(updatedBoard);

  // 5. Validate updates persisted
  TestValidator.equals(
    "updated board id remains same",
    updatedBoard.id,
    board.id,
  );
  TestValidator.equals(
    "updated board project id remains same",
    updatedBoard.project_id,
    project.id,
  );
  TestValidator.equals(
    "updated board owner id remains same",
    updatedBoard.owner_id,
    tpmUser.id,
  );
  TestValidator.equals(
    "updated board name matches update",
    updatedBoard.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated board description matches update",
    updatedBoard.description,
    updateBody.description ?? null,
  );
}
