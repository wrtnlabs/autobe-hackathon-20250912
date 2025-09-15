import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test function validates the lifecycle of board member deletion by a
 * designer user in the task management system. It covers the creation of
 * designer and TPM users, projects, boards, board members, and verifies correct
 * deletion and error handling.
 *
 * Steps include:
 *
 * 1. Designer user registration and login.
 * 2. TPM user registration and login for project ownership.
 * 3. Project creation by TPM user.
 * 4. Board creation under the project by TPM user.
 * 5. Adding the designer as a board member.
 * 6. Deleting the board member (designer) from the board.
 * 7. Validation of proper authorization and membership management behaviors.
 */
export async function test_api_board_member_erasure_by_designer(
  connection: api.IConnection,
) {
  // Step 1: Designer user registration
  const designerPassword = RandomGenerator.alphaNumeric(12);
  const designerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: designerPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;

  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: designerCreate,
    });
  typia.assert(designer);

  // Step 2: Designer user login
  const designerLoginBody = {
    email: designer.email,
    password: designerPassword,
  } satisfies ITaskManagementDesigner.ILogin;

  const designerLogin: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: designerLoginBody,
    });
  typia.assert(designerLogin);

  // Step 3: TPM user registration (project owner)
  const tpmCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmCreate });
  typia.assert(tpm);

  // Step 4: TPM user login
  const tpmLoginBody = {
    email: tpm.email,
    password: tpmCreate.password,
  } satisfies ITaskManagementTpm.ILogin;

  const tpmLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: tpmLoginBody,
    });
  typia.assert(tpmLogin);

  // Step 5: Create a Project owned by TPM
  const projectCreate = {
    owner_id: tpm.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreate,
    });
  typia.assert(project);

  TestValidator.equals(
    "project owner id equals TPM id",
    project.owner_id,
    tpm.id,
  );

  // Step 6: Create a Board under the project
  const boardCreate = {
    project_id: project.id,
    owner_id: tpm.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreate,
    });
  typia.assert(board);

  TestValidator.equals(
    "board project ID matches project ID",
    board.project_id,
    project.id,
  );
  TestValidator.equals("board owner ID matches TPM id", board.owner_id, tpm.id);

  // Step 7: Add the designer as a board member
  const nowIso = new Date().toISOString();
  const memberCreate = {
    board_id: board.id,
    user_id: designer.id,
    created_at: nowIso,
    updated_at: nowIso,
  } satisfies ITaskManagementBoardMember.ICreate;

  const member: ITaskManagementBoardMember =
    await api.functional.taskManagement.designer.boards.members.create(
      connection,
      {
        boardId: board.id,
        body: memberCreate,
      },
    );
  typia.assert(member);

  TestValidator.equals(
    "board member board ID matches board ID",
    member.board_id,
    board.id,
  );
  TestValidator.equals(
    "board member user ID matches designer ID",
    member.user_id,
    designer.id,
  );

  // Step 8: Delete the board member
  await api.functional.taskManagement.designer.boards.members.erase(
    connection,
    {
      boardId: board.id,
      memberId: member.id,
    },
  );

  // Verify error when deleting a non-existent membership
  await TestValidator.error(
    "delete non-existent member should fail",
    async () => {
      await api.functional.taskManagement.designer.boards.members.erase(
        connection,
        {
          boardId: board.id,
          memberId: member.id, // Already deleted member
        },
      );
    },
  );
}
