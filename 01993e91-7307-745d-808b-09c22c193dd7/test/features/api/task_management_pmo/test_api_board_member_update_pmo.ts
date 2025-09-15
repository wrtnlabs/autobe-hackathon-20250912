import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * Validate updating a board member in PMO context.
 *
 * This test simulates the process of:
 *
 * 1. Signing up a PMO user for authorization.
 * 2. Updating a board membership via the update API endpoint.
 *
 * It verifies that the membership is updated correctly, including IDs,
 * updated_at timestamp freshness, and deletion timestamp handling.
 *
 * Ensures proper authorization and that only authorized PMOs can update
 * members.
 *
 * Note: Board and member creation APIs are not provided; this test uses
 * simulated board and member UUIDs.
 */
export async function test_api_board_member_update_pmo(
  connection: api.IConnection,
) {
  // Step 1: Register and authorize PMO user
  const email = typia.random<string & tags.Format<"email">>();
  const pmoJoinBody = {
    email: email,
    password: "password123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoAuthorized = await api.functional.auth.pmo.join(connection, {
    body: pmoJoinBody,
  });
  typia.assert(pmoAuthorized);

  // Step 2: Setup data for update operation
  // Generate boardId and memberId to update
  const boardId = typia.random<string & tags.Format<"uuid">>();
  const memberId = typia.random<string & tags.Format<"uuid">>();

  // Prepare update data with partial fields; omit created_at for update semantics
  const updateBody = {
    board_id: boardId,
    user_id: pmoAuthorized.id,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.IUpdate;

  // Step 3: Perform update
  const updatedMember =
    await api.functional.taskManagement.pmo.boards.members.update(connection, {
      boardId: boardId,
      memberId: memberId,
      body: updateBody,
    });
  typia.assert(updatedMember);

  // Step 4: Validate response data
  TestValidator.equals("member id matches", updatedMember.id, memberId);
  TestValidator.equals("board id matches", updatedMember.board_id, boardId);
  TestValidator.equals(
    "user id matches",
    updatedMember.user_id,
    pmoAuthorized.id,
  );
  TestValidator.equals("deleted_at is null", updatedMember.deleted_at, null);

  TestValidator.predicate(
    "updated_at is recent",
    new Date(updatedMember.updated_at).getTime() > Date.now() - 60000,
  );
}
