import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * E2E test for deleting a board member by an authorized PM user.
 *
 * This test covers the registration and login of a PM user, and validates
 * the deletion of a board member by invoking the DELETE endpoint with
 * proper UUIDs. It also tests failure scenarios including invalid UUID
 * formats and unauthorized access.
 */
export async function test_api_board_member_deletion_pm_roles(
  connection: api.IConnection,
) {
  // 1. PM user registration
  const pmCreateBody = {
    email: `pmuser${Date.now()}@example.com`,
    password: "StrongPassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmUser);

  // 2. PM user login
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;
  const pmUserLogin: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(pmUserLogin);

  // Prepare valid UUIDs for boardId and memberId
  const boardId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to delete board member with valid UUIDs
  await api.functional.taskManagement.pm.boards.members.erase(connection, {
    boardId,
    memberId,
  });

  // 4. Test invalid UUID format for boardId
  await TestValidator.error(
    "Delete fails with invalid boardId UUID",
    async () => {
      await api.functional.taskManagement.pm.boards.members.erase(connection, {
        boardId: "invalid-uuid-format",
        memberId,
      });
    },
  );

  // 5. Test invalid UUID format for memberId
  await TestValidator.error(
    "Delete fails with invalid memberId UUID",
    async () => {
      await api.functional.taskManagement.pm.boards.members.erase(connection, {
        boardId,
        memberId: "invalid-uuid-format",
      });
    },
  );

  // 6. Test unauthorized access by trying deletion without PM login
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Delete fails without PM authentication",
    async () => {
      await api.functional.taskManagement.pm.boards.members.erase(
        unauthenticatedConnection,
        {
          boardId,
          memberId,
        },
      );
    },
  );
}
