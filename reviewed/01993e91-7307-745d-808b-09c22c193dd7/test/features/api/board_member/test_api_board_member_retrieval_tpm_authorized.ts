import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_board_member_retrieval_tpm_authorized(
  connection: api.IConnection,
) {
  // 1. Authenticate and establish TPM context for testing
  const tpmJoinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmAuthorized);

  // 2. Create another TPM as member user to assign to board
  const tpmCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(24),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.ICreate;
  const tpmMemberUser: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      { body: tpmCreateBody },
    );
  typia.assert(tpmMemberUser);

  // 3. Create a project owned by the authenticated TPM
  const projectCreateBody = {
    owner_id: tpmAuthorized.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. Create a board within the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmAuthorized.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 5. Assign the TPM member user as a board member
  const nowISOString = new Date().toISOString();
  const memberCreateBody = {
    board_id: board.id,
    user_id: tpmMemberUser.id,
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.ICreate;
  const boardMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.tpm.boards.members.create(connection, {
      boardId: board.id,
      body: memberCreateBody,
    });
  typia.assert(boardMember);

  // 6. Retrieve board member details using GET endpoint
  const memberDetails: ITaskManagementBoardMember =
    await api.functional.taskManagement.tpm.boards.members.at(connection, {
      boardId: board.id,
      memberId: boardMember.id,
    });
  typia.assert(memberDetails);

  // Validate the retrieved member's data correctness
  TestValidator.equals(
    "board member id matches",
    memberDetails.id,
    boardMember.id,
  );
  TestValidator.equals(
    "member user id matches",
    memberDetails.user_id,
    tpmMemberUser.id,
  );
  TestValidator.equals("board id matches", memberDetails.board_id, board.id);
  TestValidator.equals(
    "member created_at matches",
    memberDetails.created_at,
    memberCreateBody.created_at,
  );
  TestValidator.equals(
    "member updated_at matches",
    memberDetails.updated_at,
    memberCreateBody.updated_at,
  );
  TestValidator.equals(
    "member deleted_at is null",
    memberDetails.deleted_at,
    null,
  );

  // 7. Negative Test: Unauthorized access by creating a third TPM user and attempting to retrieve member details
  // Create third TPM user and switch authorization context
  const tpmUnauthorizedJoinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUnauthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmUnauthorizedJoinBody,
    });
  typia.assert(tpmUnauthorized);

  // Now the connection context is updated with unauthorized user token, attempt retrieval - expect failure
  await TestValidator.error(
    "unauthorized TPM cannot retrieve board member details",
    async () => {
      await api.functional.taskManagement.tpm.boards.members.at(connection, {
        boardId: board.id,
        memberId: boardMember.id,
      });
    },
  );
}
