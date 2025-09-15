import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPoint";

/**
 * Validate admin retrieval of a user point record success scenario.
 *
 * This test performs the full admin workflow of creating an admin user,
 * authenticating, creating a user member, creating a user point record for
 * that user, and successfully retrieving the user point by id.
 *
 * It asserts all relevant data properties match and respects nullable
 * deleted_at field handling.
 *
 * Ensures authorization and data integrity in real-world business context.
 */
export async function test_api_user_point_admin_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Admin joins to create admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssw0rd1234";
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin logs in
  const adminLogin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Create a user member
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPass!234";
  const user: IOauthServerMember =
    await api.functional.oauthServer.oauthServerMembers.create(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(user);

  // 4. Create a user point record for that user
  const initialBalance: number & tags.Type<"int32"> = 1000;
  const userPoint: IOauthServerUserPoint =
    await api.functional.oauthServer.admin.userPoints.create(connection, {
      body: {
        user_id: user.id,
        balance: initialBalance,
      } satisfies IOauthServerUserPoint.ICreate,
    });
  typia.assert(userPoint);

  // 5. Retrieve the user point by its ID as admin
  const retrievedUserPoint: IOauthServerUserPoint =
    await api.functional.oauthServer.admin.userPoints.at(connection, {
      id: userPoint.id,
    });
  typia.assert(retrievedUserPoint);

  // 6. Validate that the retrieved user point matches the created one
  TestValidator.equals("userPoint id", retrievedUserPoint.id, userPoint.id);
  TestValidator.equals(
    "userPoint user_id",
    retrievedUserPoint.user_id,
    userPoint.user_id,
  );
  TestValidator.equals(
    "userPoint balance",
    retrievedUserPoint.balance,
    userPoint.balance,
  );
  TestValidator.equals(
    "userPoint created_at",
    retrievedUserPoint.created_at,
    userPoint.created_at,
  );
  TestValidator.equals(
    "userPoint updated_at",
    retrievedUserPoint.updated_at,
    userPoint.updated_at,
  );
  // deleted_at can be null or undefined explicitly
  if (
    retrievedUserPoint.deleted_at === null ||
    retrievedUserPoint.deleted_at === undefined
  ) {
    TestValidator.predicate("deleted_at is null or undefined", true);
  } else {
    TestValidator.equals(
      "userPoint deleted_at",
      retrievedUserPoint.deleted_at,
      null,
    );
  }
}
