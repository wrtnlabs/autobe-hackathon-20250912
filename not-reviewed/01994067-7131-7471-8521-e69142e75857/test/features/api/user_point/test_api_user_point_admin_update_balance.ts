import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPoint";

/**
 * E2E Test for User Point Balance Update by Admin
 *
 * This test verifies the entire process of updating a user point balance by
 * an admin user. It starts with admin creation and login, followed by user
 * creation and initial user point creation. It then updates the user's
 * point balance and validates the update.
 *
 * Edge cases such as updating with negative balance and invalid IDs are
 * also tested to ensure proper error handling.
 *
 * Key Steps:
 *
 * 1. Create and authenticate admin user.
 * 2. Create a user member.
 * 3. Create a user point record for the member.
 * 4. Update the user point balance via admin API and verify.
 * 5. Attempt to update with invalid negative balance and invalid IDs and
 *    expect errors.
 */
export async function test_api_user_point_admin_update_balance(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "securePassword123!",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login
  const adminLogin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123!",
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Create a user member
  // Use new random email for user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IOauthServerMember =
    await api.functional.oauthServer.oauthServerMembers.create(connection, {
      body: {
        email: userEmail,
        password: "userPassw0rd!",
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(user);

  // 4. Create initial user point record for the user
  // Start with balance 100
  const initialUserPoint: IOauthServerUserPoint =
    await api.functional.oauthServer.admin.userPoints.create(connection, {
      body: {
        user_id: user.id,
        balance: 100,
      } satisfies IOauthServerUserPoint.ICreate,
    });
  typia.assert(initialUserPoint);

  // 5. Update the user point balance to a new positive value (e.g. 150)
  const updatedBalance: number & tags.Type<"int32"> = 150;
  const updatedUserPoint: IOauthServerUserPoint =
    await api.functional.oauthServer.admin.userPoints.update(connection, {
      id: initialUserPoint.id,
      body: {
        balance: updatedBalance,
      } satisfies IOauthServerUserPoint.IUpdate,
    });
  typia.assert(updatedUserPoint);
  TestValidator.equals(
    "User point balance updated correctly",
    updatedUserPoint.balance,
    updatedBalance,
  );
  TestValidator.equals(
    "User ID remains unchanged",
    updatedUserPoint.user_id,
    initialUserPoint.user_id,
  );

  // 6. Attempt to update with negative balance which should fail
  await TestValidator.error(
    "Updating user point balance with negative value should fail",
    async () => {
      await api.functional.oauthServer.admin.userPoints.update(connection, {
        id: initialUserPoint.id,
        body: {
          balance: -50,
        } satisfies IOauthServerUserPoint.IUpdate,
      });
    },
  );

  // 7. Attempt to update with invalid (non-existent) id
  await TestValidator.error(
    "Updating with non-existent user point id should fail",
    async () => {
      await api.functional.oauthServer.admin.userPoints.update(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          balance: 200,
        } satisfies IOauthServerUserPoint.IUpdate,
      });
    },
  );

  // 8. Attempt unauthorized update (simulate by re-login with user)
  // To test unauthorized update, need to authenticate as non-admin but the scenario doesn't specify user login APIs for OAuthServerMember.
  // Therefore, instead, attempt to update with a non-admin connection which has no Authorization header.
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "Unauthorized user cannot update user point balance",
    async () => {
      await api.functional.oauthServer.admin.userPoints.update(
        unauthConnection,
        {
          id: initialUserPoint.id,
          body: {
            balance: 250,
          } satisfies IOauthServerUserPoint.IUpdate,
        },
      );
    },
  );
}
