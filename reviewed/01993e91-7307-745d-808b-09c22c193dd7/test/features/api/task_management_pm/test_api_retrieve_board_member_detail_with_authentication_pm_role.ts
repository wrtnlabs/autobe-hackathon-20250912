import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Validate the retrieval of detailed board member information for authenticated
 * PM users.
 *
 * This test ensures that a Project Manager (PM) role user can register and log
 * in, obtain authorization tokens, and access detailed board member information
 * securely. It verifies that the returned membership details correspond
 * correctly to the queried member, and all timestamps follow ISO 8601 date-time
 * format. The test assumes an existing valid board ID.
 *
 * Steps:
 *
 * 1. Register a new PM user and assert the creation.
 * 2. Log in as the PM user to refresh authentication.
 * 3. Retrieve board member detail using a known valid board ID and the PM user's
 *    member ID.
 * 4. Assert the response data types and validate key fields including UUIDs and
 *    timestamps.
 */
export async function test_api_retrieve_board_member_detail_with_authentication_pm_role(
  connection: api.IConnection,
) {
  // 1. Register a new PM user
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "secureStrongPass123!",
    name: typia.random<string>(),
  } satisfies ITaskManagementPm.ICreate;
  const authorizedPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(authorizedPm);

  // 2. Login PM user with same credentials
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;
  const pmLoggedIn: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(pmLoggedIn);

  // 3. Define known valid boardId for testing
  // Replace this with an actual existing board UUID in your test environment
  const boardId = "00000000-0000-0000-0000-000000000001" satisfies string &
    tags.Format<"uuid">;

  // 4. Use PM user's id as memberId
  const memberId = authorizedPm.id;

  // 5. Retrieve board member detail
  const memberDetail: ITaskManagementBoardMember =
    await api.functional.taskManagement.pm.boards.members.at(connection, {
      boardId,
      memberId,
    });
  typia.assert(memberDetail);

  // 6. Validate returned data correctness
  TestValidator.equals(
    "memberDetail user id matches memberId",
    memberDetail.user_id,
    memberId,
  );
  TestValidator.predicate(
    "memberDetail board id matches provided boardId",
    memberDetail.board_id === boardId,
  );
  TestValidator.predicate(
    "memberDetail created_at is ISO 8601 date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d{1,9})?(Z|([+-][0-9]{2}:[0-9]{2}))$/.test(
      memberDetail.created_at,
    ),
  );
  TestValidator.predicate(
    "memberDetail updated_at is ISO 8601 date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d{1,9})?(Z|([+-][0-9]{2}:[0-9]{2}))$/.test(
      memberDetail.updated_at,
    ),
  );
  // deleted_at is optional and can be null
  if (
    memberDetail.deleted_at !== null &&
    memberDetail.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "memberDetail deleted_at is ISO 8601 date-time format if defined",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d{1,9})?(Z|([+-][0-9]{2}:[0-9]{2}))$/.test(
        memberDetail.deleted_at,
      ),
    );
  }
}
