import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPoint";

/**
 * This test covers the full workflow for admin creation and login, user member
 * creation, and user point record creation with validation.
 *
 * 1. Admin user is created and authenticated.
 * 2. A regular user member is created.
 * 3. A user point record is created for the created member by the logged in admin.
 * 4. Response validations ensure the user point record matches expectations,
 *    including UUIDs, balance, and timestamps.
 */
export async function test_api_user_point_admin_create_with_valid_user(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "strong-password-123";
  const adminCreateBody = {
    email: adminEmail,
    email_verified: true,
    password: adminPassword,
  } satisfies IOauthServerAdmin.ICreate;

  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IOauthServerAdmin.ILogin,
  });

  // 2. Create a regular OAuth server member user
  const newUserEmail = typia.random<string & tags.Format<"email">>();
  const userCreateBody = {
    email: newUserEmail,
    password: "user-password-456",
  } satisfies IOauthServerMember.ICreate;

  const newUser: IOauthServerMember =
    await api.functional.oauthServer.oauthServerMembers.create(connection, {
      body: userCreateBody,
    });
  typia.assert(newUser);

  // 3. Create a user point record for the created user
  const initialBalance = RandomGenerator.pick([0, 10, 50, 100, 1000]);

  const userPointCreateBody = {
    user_id: newUser.id,
    balance: initialBalance,
  } satisfies IOauthServerUserPoint.ICreate;

  const createdUserPoint: IOauthServerUserPoint =
    await api.functional.oauthServer.admin.userPoints.create(connection, {
      body: userPointCreateBody,
    });
  typia.assert(createdUserPoint);

  // 4. Validations
  TestValidator.predicate(
    "user point id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdUserPoint.id,
    ),
  );
  TestValidator.equals("user id matches", createdUserPoint.user_id, newUser.id);
  TestValidator.equals(
    "balance matches",
    createdUserPoint.balance,
    initialBalance,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof createdUserPoint.created_at === "string" &&
      createdUserPoint.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    typeof createdUserPoint.updated_at === "string" &&
      createdUserPoint.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null or undefined",
    createdUserPoint.deleted_at === null ||
      createdUserPoint.deleted_at === undefined,
  );
}
