import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Complete test verifying a TPM user's creation flow of a project and a board
 * within it.
 *
 * This test covers:
 *
 * 1. TPM user registration and authentication
 * 2. Project creation by the TPM user
 * 3. Board creation within the project, ensuring proper associations and unique
 *    codes
 *
 * Each API response is validated for type safety and proper business logic.
 * TestValidator checks confirm identity consistencies and correctness.
 */
export async function test_api_project_board_creation_tpm(
  connection: api.IConnection,
) {
  // 1. Register a new TPM user
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const authorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(authorized);

  // 2. Create a new project with the TPM owner_id
  const projectCreateBody = {
    owner_id: authorized.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // Validate that project owner_id matches TPM created
  TestValidator.equals(
    "project owner_id should match TPM id",
    project.owner_id,
    authorized.id,
  );

  // 3. Create a board under the above project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: authorized.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // Validate board ownership and project association
  TestValidator.equals(
    "board owner_id should match TPM id",
    board.owner_id,
    authorized.id,
  );
  TestValidator.equals(
    "board project_id should match project id",
    board.project_id,
    project.id,
  );

  // Validate unique code assigned
  TestValidator.predicate("board code is non-empty", board.code.length > 0);

  // Additional validation could check timestamps and id formats implicitly by typia.assert()
}
