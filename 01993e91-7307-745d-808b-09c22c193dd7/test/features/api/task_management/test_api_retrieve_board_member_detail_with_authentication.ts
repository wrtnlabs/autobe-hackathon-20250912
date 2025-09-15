import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates the ability to retrieve detailed information of a
 * board member in the TPM system. The test covers full authentication flow
 * for a TPM user, and ensures the appropriate member data is returned.
 *
 * It includes verifying access control by checking API responses in
 * unauthorized scenarios and testing error cases when non-existent board or
 * member IDs are presented.
 *
 * Steps:
 *
 * 1. Sign up a TPM user using api.functional.auth.tpm.join and login.
 * 2. Simulate valid boardId and memberId data (generate UUIDs) to represent
 *    board and member existence.
 * 3. Retrieve the board member's details with GET
 *    /taskManagement/tpm/boards/{boardId}/members/{memberId}.
 * 4. Validate returned member info matches expectation and contains complete
 *    UUIDs and timestamps.
 * 5. Attempt access with invalid or missing authentication to validate
 *    security enforcement.
 * 6. Try fetching member details with invalid board or member IDs to confirm
 *    proper error handling.
 *
 * The test ensures correctness, security controls, and error management in
 * board membership retrieval.
 */
export async function test_api_retrieve_board_member_detail_with_authentication(
  connection: api.IConnection,
) {
  // 1-2. Register and authenticate TPM user
  const signupBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "Test@1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const authorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: signupBody,
    });
  typia.assert(authorized);

  // 3. Prepare valid UUIDs for boardId and memberId
  const boardId = typia.random<string & tags.Format<"uuid">>();
  const memberId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve board member details using valid authentication
  const boardMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.tpm.boards.members.at(connection, {
      boardId,
      memberId,
    });
  typia.assert(boardMember);

  // Validate key properties
  TestValidator.predicate(
    "boardMember.id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      boardMember.id,
    ),
  );
  TestValidator.equals(
    "boardMember.board_id matches",
    boardMember.board_id,
    boardId,
  );
  TestValidator.equals(
    "boardMember.user_id matches",
    boardMember.user_id,
    memberId,
  );

  TestValidator.predicate(
    "boardMember.created_at is ISO date string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      boardMember.created_at,
    ),
  );
  TestValidator.predicate(
    "boardMember.updated_at is ISO date string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      boardMember.updated_at,
    ),
  );

  // 5. Try unauthorized access (no authentication) - should throw
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated access should throw", async () => {
    await api.functional.taskManagement.tpm.boards.members.at(
      unauthenticatedConnection,
      {
        boardId,
        memberId,
      },
    );
  });

  // 6. Try invalid boardId/memberId - should throw not found error
  const invalidBoardId = typia.random<string & tags.Format<"uuid">>();
  const invalidMemberId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("invalid boardId should throw", async () => {
    await api.functional.taskManagement.tpm.boards.members.at(connection, {
      boardId: invalidBoardId,
      memberId,
    });
  });
  await TestValidator.error("invalid memberId should throw", async () => {
    await api.functional.taskManagement.tpm.boards.members.at(connection, {
      boardId,
      memberId: invalidMemberId,
    });
  });
}
