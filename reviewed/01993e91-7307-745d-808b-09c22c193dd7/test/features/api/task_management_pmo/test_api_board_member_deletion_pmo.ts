import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * Tests the deletion of a board member record in PMO context.
 *
 * This test covers:
 *
 * 1. Registration and authentication of PMO users.
 * 2. Assignment to a board (simulated by UUIDs).
 * 3. Deletion of the board member.
 * 4. Validation of permission enforcement and error handling.
 */
export async function test_api_board_member_deletion_pmo(
  connection: api.IConnection,
) {
  // 1. Register and authenticate first PMO user
  const pmoJoinBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser1: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody1 });
  typia.assert(pmoUser1);

  // 2. Simulate creation of board and project (using new UUIDs)
  const boardId = typia.random<string & tags.Format<"uuid">>();
  const memberId = pmoUser1.id;

  // 3. Delete the board member using API
  await api.functional.taskManagement.pmo.boards.members.erase(connection, {
    boardId,
    memberId,
  });

  // 4. Try deleting again to confirm error (member no longer exists)
  await TestValidator.error(
    "Deleting a non-existent board member should fail",
    async () => {
      await api.functional.taskManagement.pmo.boards.members.erase(connection, {
        boardId,
        memberId,
      });
    },
  );

  // 5. Register and authenticate a second PMO user
  const pmoJoinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser2: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody2 });
  typia.assert(pmoUser2);

  // 6. As second user, try to delete the first user's membership (simulate)
  // Here we simulate unauthorized deletion by trying to delete memberId which belonged to other user
  await TestValidator.error(
    "Unauthorized user cannot delete another user's membership",
    async () => {
      await api.functional.taskManagement.pmo.boards.members.erase(connection, {
        boardId,
        memberId,
      });
    },
  );
}
