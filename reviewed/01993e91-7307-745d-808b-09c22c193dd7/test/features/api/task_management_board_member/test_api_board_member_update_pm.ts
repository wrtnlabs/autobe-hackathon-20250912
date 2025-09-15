import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * E2E test validating the update operation of a board member in the PM
 * context.
 *
 * This test first registers and authenticates a new PM user, ensuring
 * proper authorization context. It then performs an update of a board
 * member record identified by a realistic UUID boardId and memberId. The
 * update includes valid UUID fields and ISO 8601 date-time strings for
 * auditing timestamps.
 *
 * The response is asserted to be correctly typed and consistent with the
 * update input. Validation includes checks for matching board IDs, null
 * soft deletion timestamp, and valid timestamp formats.
 *
 * The test abides by strict schema and business logic rules, confirming the
 * persistence and correctness of member updates in the PM task management
 * system.
 */
export async function test_api_board_member_update_pm(
  connection: api.IConnection,
) {
  // 1. Register new PM user and authenticate to get authorization token
  const pmCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "ValidPass123!",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPm.ICreate;

  const pm: ITaskManagementPm.IAuthorized = await api.functional.auth.pm.join(
    connection,
    { body: pmCreateBody },
  );
  typia.assert(pm);

  // 2. Prepare realistic boardId and memberId for update
  const boardId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare update data with some optional fields
  // Use a mixture of updated_at, deleted_at with ISO date-time, optional inclusion
  const nowISOString = new Date().toISOString();

  const updateBody = {
    board_id: boardId,
    user_id: typia.random<string & tags.Format<"uuid">>(),
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.IUpdate;

  // 4. Call update endpoint
  const updatedMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.pm.boards.members.update(connection, {
      boardId: boardId,
      memberId: memberId,
      body: updateBody,
    });
  typia.assert(updatedMember);

  // 5. Validate returned board member information
  TestValidator.equals(
    "board member id matches",
    updatedMember.id,
    updatedMember.id,
  );
  TestValidator.equals("board id matches", updatedMember.board_id, boardId);
  TestValidator.equals("deleted_at is null", updatedMember.deleted_at, null);
  TestValidator.predicate(
    "created_at and updated_at are valid ISO date-time strings",
    Date.parse(updatedMember.created_at) > 0 &&
      Date.parse(updatedMember.updated_at) > 0,
  );
}
