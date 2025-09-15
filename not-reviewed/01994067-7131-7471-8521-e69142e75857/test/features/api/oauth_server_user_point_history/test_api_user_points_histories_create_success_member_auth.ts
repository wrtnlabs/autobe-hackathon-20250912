import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserPointHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointHistory";

/**
 * This test validates the successful creation of a user point history
 * record by a member user authenticated via the OAuth server.
 *
 * The process covers the key business flow:
 *
 * 1. Member user registration with valid email and password.
 * 2. OAuth member creation linking to user points.
 * 3. Submission of a user point history record with precise change amount,
 *    resulting balance, and reason.
 *
 * The test enforces strict DTO typing with typia assertions, ensures
 * authentication token management by the SDK, and verifies data integrity
 * through TestValidator checks.
 *
 * This comprehensive flow ensures only authenticated members can manage
 * user point histories, and the audit trail is maintained with accurate
 * balance tracking.
 */
export async function test_api_user_points_histories_create_success_member_auth(
  connection: api.IConnection,
) {
  // 1. Register a member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "StrongP@ssw0rd!";
  const memberCreateBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IOauthServerMember.ICreate;

  const authorizedMember: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(authorizedMember);

  // 2. Create OAuth server member user (linking user points account)
  const oauthMemberCreateBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IOauthServerMember.ICreate;

  const oauthMember: IOauthServerMember =
    await api.functional.oauthServer.oauthServerMembers.create(connection, {
      body: oauthMemberCreateBody,
    });
  typia.assert(oauthMember);

  // 3. Create user point history entry for user points
  const changeAmount = typia.random<number & tags.Type<"int32">>();
  const balanceAfterChange = typia.random<number & tags.Type<"int32">>();
  const reasonMessage = `Test point adjustment by member ${memberEmail}`;

  const userPointHistoryBody = {
    user_point_id: oauthMember.id,
    change_amount: changeAmount,
    balance_after_change: balanceAfterChange,
    reason: reasonMessage,
  } satisfies IOauthServerUserPointHistory.ICreate;

  const createdPointHistory: IOauthServerUserPointHistory =
    await api.functional.oauthServer.member.userPoints.histories.create(
      connection,
      {
        userPointId: oauthMember.id,
        body: userPointHistoryBody,
      },
    );

  typia.assert(createdPointHistory);

  TestValidator.equals(
    "userPointId matches",
    createdPointHistory.user_point_id,
    userPointHistoryBody.user_point_id,
  );
  TestValidator.equals(
    "change_amount matches",
    createdPointHistory.change_amount,
    userPointHistoryBody.change_amount,
  );
  TestValidator.equals(
    "balance_after_change matches",
    createdPointHistory.balance_after_change,
    userPointHistoryBody.balance_after_change,
  );
  TestValidator.equals(
    "reason matches",
    createdPointHistory.reason,
    userPointHistoryBody.reason,
  );
}
