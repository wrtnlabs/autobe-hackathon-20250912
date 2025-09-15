import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_management_board_get_detail_pmo(
  connection: api.IConnection,
) {
  // 1. PMO user joins
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "PmoPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 2. TPM user joins
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TpmPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // 3. PMO login again to ensure PMO role context
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoLogin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoLogin);

  // 4. PMO creates a project owned by TPM
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 5. TPM login again for TPM role context
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmLogin);

  // 6. TPM creates a board under project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 7. PMO login again for PMO role context
  const pmoLoginAgain: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoLoginAgain);

  // 8. PMO fetches board detail
  const fetchedBoard: ITaskManagementBoard =
    await api.functional.taskManagement.pmo.projects.boards.atBoardInProject(
      connection,
      { projectId: project.id, boardId: board.id },
    );
  typia.assert(fetchedBoard);

  // Validations
  TestValidator.equals("board id matches", fetchedBoard.id, board.id);
  TestValidator.equals(
    "board project id matches",
    fetchedBoard.project_id,
    project.id,
  );
  TestValidator.equals(
    "board owner id matches",
    fetchedBoard.owner_id,
    tpmUser.id,
  );
  TestValidator.equals("board code matches", fetchedBoard.code, board.code);
  TestValidator.equals("board name matches", fetchedBoard.name, board.name);
  TestValidator.equals(
    "board description matches",
    fetchedBoard.description,
    board.description,
  );
}
