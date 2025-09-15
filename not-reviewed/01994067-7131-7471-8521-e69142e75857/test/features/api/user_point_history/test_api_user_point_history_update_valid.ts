import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPoint";
import type { IOauthServerUserPointHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointHistory";

/**
 * This test verifies the full end-to-end workflow of updating a user point
 * history entry.
 *
 * The flow includes:
 *
 * 1. Admin user creation and login
 * 2. Member user creation and login
 * 3. Admin creating a user point balance record for the member user
 * 4. Member creating a user point history record linked to that balance
 * 5. Member updating the user point history record with new valid data
 * 6. Validation that the update was successful and returned correct data
 *
 * This test ensures role-based access control, correct data updates, and
 * response validation for the user point transaction history update
 * endpoint.
 */
export async function test_api_user_point_history_update_valid(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        email_verified: true,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
    } satisfies IOauthServerAdmin.ILogin,
  });

  // 2. Create and authenticate member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPass123!",
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(member);

  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPass123!",
    } satisfies IOauthServerMember.ILogin,
  });

  // 3. Admin creates user point balance for member user
  const userPoint: IOauthServerUserPoint =
    await api.functional.oauthServer.admin.userPoints.create(connection, {
      body: {
        user_id: member.id,
        balance: 1000,
      } satisfies IOauthServerUserPoint.ICreate,
    });
  typia.assert(userPoint);

  // 4. Member creates a user point history record
  const historyCreateBody = {
    user_point_id: userPoint.id,
    change_amount: 100,
    balance_after_change: 1100,
    reason: "Initial point top-up",
  } satisfies IOauthServerUserPointHistory.ICreate;

  const history: IOauthServerUserPointHistory =
    await api.functional.oauthServer.member.userPoints.histories.create(
      connection,
      {
        userPointId: userPoint.id,
        body: historyCreateBody,
      },
    );
  typia.assert(history);

  // 5. Member updates the user point history record
  const historyUpdateBody = {
    change_amount: 150,
    balance_after_change: 1150,
    reason: "Updated point top-up",
  } satisfies IOauthServerUserPointHistory.IUpdate;

  const updatedHistory: IOauthServerUserPointHistory =
    await api.functional.oauthServer.member.userPoints.histories.update(
      connection,
      {
        userPointId: userPoint.id,
        id: history.id,
        body: historyUpdateBody,
      },
    );
  typia.assert(updatedHistory);

  // 6. Validate updated fields
  TestValidator.equals(
    "change_amount updated correctly",
    updatedHistory.change_amount,
    150,
  );
  TestValidator.equals(
    "balance_after_change updated correctly",
    updatedHistory.balance_after_change,
    1150,
  );
  TestValidator.equals(
    "reason updated correctly",
    updatedHistory.reason,
    "Updated point top-up",
  );
}
