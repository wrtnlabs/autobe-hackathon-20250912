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
 * This test function validates the admin's ability to retrieve detailed
 * information about a specific user point history record. It simulates the
 * entire flow involving creating and authenticating as an admin and a
 * member, creating a user point and history, then retrieving and verifying
 * the history record with admin authorization.
 *
 * The test ensures proper role switching, correct DTO usage, and response
 * validation. It asserts that fetched data matches the created data,
 * validating business logic correctness and authorization boundaries.
 */
export async function test_api_user_points_histories_at_success_admin_auth(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin user to perform privileged operations
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin-password";
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Authenticate as admin to establish authorization context
  const adminLogin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Create and authenticate a member user for user point association
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member-password";
  const member: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(member);

  // 4. Authenticate as member to establish member context
  const memberLogin: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ILogin,
    });
  typia.assert(memberLogin);

  // 5. Switch back to admin context for privileged create operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IOauthServerAdmin.ILogin,
  });

  // 6. Create a user point record for the member user with initial balance
  const userPoint: IOauthServerUserPoint =
    await api.functional.oauthServer.admin.userPoints.create(connection, {
      body: {
        user_id: member.id,
        balance: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      } satisfies IOauthServerUserPoint.ICreate,
    });
  typia.assert(userPoint);

  // 7. Switch to member context to add a user point history record
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IOauthServerMember.ILogin,
  });

  // 8. Create a user point history record linked to the created user point
  const historyBody = {
    user_point_id: userPoint.id,
    change_amount: 100,
    balance_after_change: userPoint.balance + 100,
    reason: "Points added for testing",
  } satisfies IOauthServerUserPointHistory.ICreate;
  const userPointHistory: IOauthServerUserPointHistory =
    await api.functional.oauthServer.member.userPoints.histories.create(
      connection,
      {
        userPointId: userPoint.id,
        body: historyBody,
      },
    );
  typia.assert(userPointHistory);

  // 9. Switch back to admin context to test admin access to user point history details
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IOauthServerAdmin.ILogin,
  });

  // 10. Retrieve the user point history details by userPointId and id
  const gotHistory: IOauthServerUserPointHistory =
    await api.functional.oauthServer.admin.userPoints.histories.at(connection, {
      userPointId: userPoint.id,
      id: userPointHistory.id,
    });
  typia.assert(gotHistory);

  // 11. Validate that the retrieved history matches the created one
  TestValidator.equals(
    "user point history id matches",
    gotHistory.id,
    userPointHistory.id,
  );
  TestValidator.equals(
    "user point id matches",
    gotHistory.user_point_id,
    userPoint.id,
  );
  TestValidator.equals(
    "change amount matches",
    gotHistory.change_amount,
    historyBody.change_amount,
  );
  TestValidator.equals(
    "balance after change matches",
    gotHistory.balance_after_change,
    historyBody.balance_after_change,
  );
  TestValidator.equals("reason matches", gotHistory.reason, historyBody.reason);
}
