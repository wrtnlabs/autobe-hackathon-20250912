import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * E2E test function for board member creation with PM role authentication. This
 * function tests the full sequence: PM user registration, login, and creation
 * of a board member linked to that PM user.
 *
 * Flow:
 *
 * 1. Register new PM user via /auth/pm/join.
 * 2. Authenticate PM user via /auth/pm/login.
 * 3. Generate a valid boardId and create a board member linking this board and
 *    user.
 * 4. Validate the response accurately reflects membership data.
 * 5. Test error cases including duplicate membership and invalid identifiers.
 */
export async function test_api_board_member_creation_with_authentication_pm_role(
  connection: api.IConnection,
) {
  // Step 1: Register a new PM user
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const createdPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(createdPm);

  // Step 2: Authenticate the PM user
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const loggedInPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(loggedInPm);

  // Use the authenticated PM user id
  const pmUserId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(loggedInPm.id);

  // Step 3: Create board member linking the user with a valid boardId
  // As board creation API is not provided, generate a valid UUID for boardId
  const boardId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Current ISO timestamp for created_at and updated_at
  const nowDateString: string & tags.Format<"date-time"> =
    new Date().toISOString();

  const createBody = {
    board_id: boardId,
    user_id: pmUserId,
    created_at: nowDateString,
    updated_at: nowDateString,
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.ICreate;

  const createdMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.pm.boards.members.create(connection, {
      boardId: boardId,
      body: createBody,
    });
  typia.assert(createdMember);

  // Step 4: Validate the response
  TestValidator.equals(
    "board member's board_id matches boardId",
    createdMember.board_id,
    boardId,
  );
  TestValidator.equals(
    "board member's user_id matches PM user id",
    createdMember.user_id,
    pmUserId,
  );

  TestValidator.predicate(
    "board member has valid uuid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdMember.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 date",
    !isNaN(Date.parse(createdMember.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date",
    !isNaN(Date.parse(createdMember.updated_at)),
  );

  // Step 5: Test duplicate creation should fail (same boardId and user_id)
  await TestValidator.error("duplicate board members should fail", async () => {
    await api.functional.taskManagement.pm.boards.members.create(connection, {
      boardId: boardId,
      body: createBody,
    });
  });

  // Step 6: Test invalid boardId format (not UUID string)
  await TestValidator.error("invalid boardId format should fail", async () => {
    const invalidBoardId = "invalid-uuid-format";
    await api.functional.taskManagement.pm.boards.members.create(connection, {
      boardId: invalidBoardId as string & tags.Format<"uuid">,
      body: {
        ...createBody,
        board_id: invalidBoardId as string & tags.Format<"uuid">,
      },
    });
  });

  // Step 7: Test invalid user_id format
  await TestValidator.error("invalid user_id format should fail", async () => {
    const invalidUserId = "invalid-uuid-format";
    await api.functional.taskManagement.pm.boards.members.create(connection, {
      boardId: boardId,
      body: {
        ...createBody,
        user_id: invalidUserId as string & tags.Format<"uuid">,
      },
    });
  });
}
