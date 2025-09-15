import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This end-to-end test function verifies the deletion of a board member by an
 * authorized Technical Project Manager (TPM) user within a task management
 * system. The test covers the complete functional workflow starting from
 * authentication and user creation to project and board setup, assignment of
 * the TPM user as a board member, and finally the deletion operation. It
 * ensures that only authorized TPM users can delete board members and verifies
 * error scenarios when unauthorized or non-existent members are targeted.
 *
 * Steps:
 *
 * 1. Admin TPM user joins (registers) and logs in to establish initial
 *    authorization with management rights.
 * 2. Create another TPM user who will be the member to assign.
 * 3. Create a new project owned by the admin TPM user.
 * 4. Create a board under the created project with the admin TPM user as owner.
 * 5. Assign the created TPM user as a member of the board.
 * 6. Login as the assigned TPM user to establish member authorization context.
 * 7. Try to delete the assigned member from the board as the TPM user (authorized
 *    scenario).
 * 8. Test deletion error handling for unauthorized deletion attempts (e.g.,
 *    unauthenticated users or invalid member IDs).
 *
 * The test asserts all relevant API responses with typia validation and uses
 * descriptive TestValidator assertions to ensure data integrity and correct
 * authorization logic in the board member deletion process.
 */
export async function test_api_board_member_deletion_by_tpm_authorized(
  connection: api.IConnection,
) {
  // 1. Admin TPM user join and authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const admin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create TPM user to assign as member
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    // password_hash in create user API expects hashed password,
    // here we pass a random alphanumeric string to simulate hash
    password_hash: RandomGenerator.alphaNumeric(20),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.ICreate;

  const member: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      { body: memberCreateBody },
    );
  typia.assert(member);

  // 3. Create a project by admin
  const projectCreateBody = {
    owner_id: admin.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. Create a board in the project owned by admin
  const boardCreateBody = {
    project_id: project.id,
    owner_id: admin.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 5. Assign member user to board
  const now = new Date().toISOString();
  const boardMemberCreateBody = {
    board_id: board.id,
    user_id: member.id,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.ICreate;

  const boardMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.tpm.boards.members.create(connection, {
      boardId: board.id,
      body: boardMemberCreateBody,
    });
  typia.assert(boardMember);

  // 6. Login as TPM user member
  const memberLoginBody = {
    email: memberCreateBody.email,
    password: memberCreateBody.password_hash,
  } satisfies ITaskManagementTpm.ILogin;

  const authorizedMember: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: memberLoginBody });
  typia.assert(authorizedMember);

  // 7. Delete the member from the board (authorized deletion)
  await api.functional.taskManagement.tpm.boards.members.erase(connection, {
    boardId: board.id,
    memberId: boardMember.id,
  });

  // 8. Test error when deleting a non-existent member
  await TestValidator.error(
    "deleting a non-existent member should fail",
    async () => {
      await api.functional.taskManagement.tpm.boards.members.erase(connection, {
        boardId: board.id,
        memberId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 9. Test error when unauthorized deletion is attempted
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.taskManagement.tpm.boards.members.erase(
        unauthenticatedConnection,
        { boardId: board.id, memberId: boardMember.id },
      );
    },
  );

  // 10. Additional validation: ensure member deletion no longer possible
  await TestValidator.error(
    "deletion of already deleted member should fail",
    async () => {
      await api.functional.taskManagement.tpm.boards.members.erase(connection, {
        boardId: board.id,
        memberId: boardMember.id,
      });
    },
  );
}
