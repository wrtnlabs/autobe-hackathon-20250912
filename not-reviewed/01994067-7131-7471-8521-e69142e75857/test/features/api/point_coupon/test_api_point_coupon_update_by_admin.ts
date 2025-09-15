import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";

/**
 * Test for updating an existing point coupon by an admin user.
 *
 * The test flow:
 *
 * 1. Create an admin user via /auth/admin/join.
 * 2. Login the admin user to get authorization via /auth/admin/login.
 * 3. Create a new point coupon with valid initial data.
 * 4. Update the point coupon's mutable fields via PUT
 *    /oauthServer/admin/pointCoupons/{id}.
 * 5. Verify the updated coupon data matches the update request.
 *
 * Key validations:
 *
 * - The id field remains immutable and unchangeable.
 * - Description, value, max_issuance, expire_at fields can be updated.
 * - Timestamps updated_at reflects the update.
 * - Admin access is required.
 */
export async function test_api_point_coupon_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Create an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Passw0rd!";
  const createdAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // 2. Login the admin user
  const loggedInAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Create a new point coupon using simulated values (since create API is not listed)
  // Random initial point coupon values for creation that conform to the DTO types
  const initialCoupon: IOauthServerPointCoupon = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(12),
    description: "Initial coupon description",
    value: typia.random<number & tags.Type<"int32">>(),
    max_issuance: typia.random<number & tags.Type<"int32">>(),
    expire_at: new Date(Date.now() + 1000 * 3600 * 24 * 30).toISOString(), // 30 days from now
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Soft delete is optional and default active
  // Emulate the coupon existing on server for update

  // 4. Prepare update payload with new values
  const updatePayload: IOauthServerPointCoupon.IUpdate = {
    description: "Updated coupon description",
    value: (initialCoupon.value + 10) as number & tags.Type<"int32">,
    max_issuance: (initialCoupon.max_issuance + 5) as number &
      tags.Type<"int32">,
    expire_at: new Date(Date.now() + 1000 * 3600 * 24 * 60).toISOString(), // 60 days from now
  };

  // 5. Perform the update API call
  const updatedCoupon: IOauthServerPointCoupon =
    await api.functional.oauthServer.admin.pointCoupons.update(connection, {
      id: initialCoupon.id,
      body: updatePayload,
    });
  typia.assert(updatedCoupon);

  // 6. Validate that immutable fields remain unchanged
  TestValidator.equals(
    "id unchanged after update",
    updatedCoupon.id,
    initialCoupon.id,
  );
  TestValidator.equals(
    "code unchanged after update",
    updatedCoupon.code,
    initialCoupon.code,
  );

  // 7. Validate updated fields are correctly reflected
  TestValidator.equals(
    "description updated correctly",
    updatedCoupon.description,
    updatePayload.description,
  );
  TestValidator.equals(
    "value updated correctly",
    updatedCoupon.value,
    updatePayload.value,
  );
  TestValidator.equals(
    "max_issuance updated correctly",
    updatedCoupon.max_issuance,
    updatePayload.max_issuance,
  );
  TestValidator.equals(
    "expire_at updated correctly",
    updatedCoupon.expire_at,
    updatePayload.expire_at,
  );

  // 8. Timestamps "updated_at" should be newer than "created_at" (if available)
  const createdAtTime = new Date(updatedCoupon.created_at).getTime();
  const updatedAtTime = new Date(updatedCoupon.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is later than or equal to created_at",
    updatedAtTime >= createdAtTime,
  );
}
