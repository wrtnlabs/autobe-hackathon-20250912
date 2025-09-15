import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validate TPM user board deletion with TPM authentication.
 *
 * This test confirms that a TPM user can register, login, create a project,
 * create a board in that project, and then delete the board successfully.
 *
 * It ensures that TPM authentication is properly established and the board
 * deletion endpoint functions as expected.
 *
 * The test includes checks for response validity and business logic
 * compliance, including ownership and linkage between TPM user, project,
 * and board.
 *
 * Steps:
 *
 * 1. TPM user join
 * 2. TPM user login
 * 3. TPM user create project
 * 4. TPM user create board in the project
 * 5. TPM user delete the created board
 */
export async function test_api_task_management_board_deletion_with_tpm_authentication(
  connection: api.IConnection,
) {
  // 1. TPM user join
  const tpmJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "Password123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // 2. TPM user login
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const loginAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(loginAuthorized);

  // 3. TPM user create project
  const newProjectBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementProject.ICreate;

  const createdProject: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: newProjectBody,
    });
  typia.assert(createdProject);

  TestValidator.equals(
    "Project owner matches TPM user",
    createdProject.owner_id,
    tpmUser.id,
  );

  // 4. TPM user create board in the project
  const newBoardBody = {
    project_id: createdProject.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementBoard.ICreate;

  const createdBoard: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: createdProject.id,
      body: newBoardBody,
    });
  typia.assert(createdBoard);

  TestValidator.equals(
    "Board owner matches TPM user",
    createdBoard.owner_id,
    tpmUser.id,
  );
  TestValidator.equals(
    "Board project matches project",
    createdBoard.project_id,
    createdProject.id,
  );

  // 5. TPM user delete the created board
  await api.functional.taskManagement.tpm.projects.boards.erase(connection, {
    projectId: createdProject.id,
    boardId: createdBoard.id,
  });
}
