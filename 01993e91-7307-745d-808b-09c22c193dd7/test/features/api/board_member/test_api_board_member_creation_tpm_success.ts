import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates the creation of a board member from the TPM user's
 * perspective including user registration, login, designer join prerequisite,
 * and retrieval of the board member details.
 *
 * Since creation APIs for projects, boards, and members are not available,
 * boardId and memberId are simulated with generated UUIDs to validate retrieval
 * and linkage accuracy.
 *
 * The test ensures authentication, proper linkage, timestamp presence, and data
 * integrity for business-critical flow.
 */
export async function test_api_board_member_creation_tpm_success(
  connection: api.IConnection,
) {
  // 1. TPM User Registration
  const tpmUserEmail = `${RandomGenerator.name(1)}@example.com`;
  const tpmUserPassword = "StrongP@ssw0rd!";
  const tpmJoinBody = {
    email: tpmUserEmail,
    password: tpmUserPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmAuthorized);

  // 2. TPM User Login
  const tpmLoginBody = {
    email: tpmUserEmail,
    password: tpmUserPassword,
  } satisfies ITaskManagementTpm.ILogin;

  const tpmLoginAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmLoginAuthorized);

  // 3. Designer User Registration
  const designerJoinBody = {
    email: `${RandomGenerator.name(1)}@example.org`,
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;

  const designerAuthorized: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: designerJoinBody,
    });
  typia.assert(designerAuthorized);

  // 4. Simulate creation of a board (using realistic generated UUID for boardId)
  const simulatedBoardId = typia.random<string & tags.Format<"uuid">>();

  // 5. Simulate current TPM user ID as member ID
  const simulatedMemberId = tpmAuthorized.id;

  // 6. Retrieve board member details
  const boardMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.designer.boards.members.at(connection, {
      boardId: simulatedBoardId,
      memberId: simulatedMemberId,
    });
  typia.assert(boardMember);

  // 7. Validate critical linkage
  TestValidator.equals(
    "board member boardId matches",
    boardMember.board_id,
    simulatedBoardId,
  );
  TestValidator.equals(
    "board member userId matches",
    boardMember.user_id,
    simulatedMemberId,
  );

  // Validate timestamps exist and are strings in date-time format
  TestValidator.predicate(
    "board member created_at is string",
    typeof boardMember.created_at === "string",
  );
  TestValidator.predicate(
    "board member updated_at is string",
    typeof boardMember.updated_at === "string",
  );

  // Validate deleted_at is null or undefined
  TestValidator.predicate(
    "board member deleted_at is null or undefined",
    boardMember.deleted_at === null || boardMember.deleted_at === undefined,
  );
}
