import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test validates creation of a board member by a PMO user.
 *
 * Workflow:
 *
 * 1. Register PMO user and login
 * 2. Register TPM user and login
 * 3. TPM user creates project
 * 4. TPM user creates board in project
 * 5. PMO user adds TPM user as board member
 *
 * All responses are validated with type assertions and business checks.
 */
export async function test_api_board_member_creation_pmo_role_success(
  connection: api.IConnection,
) {
  // 1. PMO user registration
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoPassword = "P@ssw0rd1234";
  const pmoJoinBody = {
    email: pmoEmail,
    password: pmoPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 2. PMO user login
  const pmoLoginBody = {
    email: pmoEmail,
    password: pmoPassword,
  } satisfies ITaskManagementPmo.ILogin;

  const pmoLoggedInUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoLoggedInUser);

  // 3. TPM user registration
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "TpmUserPass1234";
  const tpmJoinBody = {
    email: tpmEmail,
    password: tpmPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // 4. TPM user login
  const tpmLoginBody = {
    email: tpmEmail,
    password: tpmPassword,
  } satisfies ITaskManagementTpm.ILogin;

  const tpmLoggedInUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmLoggedInUser);

  // 5. TPM user creates project
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);
  TestValidator.equals("project owner id check", project.owner_id, tpmUser.id);

  // 6. TPM user creates board within project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);
  TestValidator.equals("board project id check", board.project_id, project.id);
  TestValidator.equals("board owner id check", board.owner_id, tpmUser.id);

  // 7. PMO user adds TPM user as board member
  // Switch to PMO user authentication for this step
  await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });

  const nowISO = new Date().toISOString();
  const boardMemberCreateBody = {
    board_id: board.id,
    user_id: tpmUser.id,
    created_at: nowISO,
    updated_at: nowISO,
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.ICreate;

  const boardMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.pmo.boards.members.create(connection, {
      boardId: board.id,
      body: boardMemberCreateBody,
    });
  typia.assert(boardMember);
  TestValidator.equals("board member board id", boardMember.board_id, board.id);
  TestValidator.equals("board member user id", boardMember.user_id, tpmUser.id);
  TestValidator.predicate(
    "board member created_at is valid ISO",
    !isNaN(Date.parse(boardMember.created_at)),
  );
  TestValidator.predicate(
    "board member updated_at is valid ISO",
    !isNaN(Date.parse(boardMember.updated_at)),
  );
}
