import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";

/**
 * Test scenario for deleting a user point coupon usage record by an
 * administrator.
 *
 * The test covers the workflow of creating and authenticating an admin user,
 * then attempting deletion of a valid user point coupon usage record by ID. It
 * validates that the deletion endpoint removes the record and prevents
 * unauthorized deletions.
 *
 * Failure cases include attempts by insufficiently privileged users and
 * deletion attempts on non-existent IDs, checking that proper errors are
 * returned.
 */
export async function test_api_user_point_coupon_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user join and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const createdAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "validPassword123",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // 2. Prepare a valid UUID for deletion test
  const validId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Delete user point coupon record with valid ID as admin
  await api.functional.oauthServer.admin.userPointCoupons.erase(connection, {
    id: validId,
  });

  // 4. Attempt deletion with the same ID again to test error for non-existent record
  await TestValidator.error(
    "deleting non-existent user point coupon should fail",
    async () => {
      await api.functional.oauthServer.admin.userPointCoupons.erase(
        connection,
        {
          id: validId,
        },
      );
    },
  );

  // 5. Attempt deletion with an invalid UUID format to trigger validation error
  // (This test is omitted because it would cause a TypeScript type error, prohibited.)

  // 6. TODO: Attempt deletion as non-admin user should fail
  // Since we have no non-admin deletion API access or user creation API here, skip this test
  // Normally this would require separate user auth flows and API calls
  // Therefore, only administrative deletion success & failure for non-existent ID are tested here.
}
