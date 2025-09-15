import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";
import type { IOauthServerUserPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointCoupon";

/**
 * End-to-end test for retrieving detailed user point coupon by ID.
 *
 * The test flow is:
 *
 * 1. Admin user joins and authenticates.
 * 2. Admin creates a point coupon.
 * 3. Admin creates a user point coupon linking user and coupon.
 * 4. Retrieve and verify the user point coupon details by ID.
 * 5. Test error handling for invalid ID and unauthorized access.
 */
export async function test_api_user_point_coupon_retrieve_detail_by_id(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "securePassword123",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a point coupon
  const expireDate: string = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const pointCouponCreateBody = {
    code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    description: "Test coupon for e2e test",
    value: 100,
    max_issuance: 10,
    expire_at: expireDate,
  } satisfies IOauthServerPointCoupon.ICreate;
  const pointCoupon: IOauthServerPointCoupon =
    await api.functional.oauthServer.admin.pointCoupons.create(connection, {
      body: pointCouponCreateBody,
    });
  typia.assert(pointCoupon);

  // 3. Admin creates a user point coupon record
  // Use the admin.id as user_id for linkage simplification
  const usedAt: string = new Date().toISOString();
  const userPointCouponCreateBody = {
    user_id: admin.id,
    point_coupon_id: pointCoupon.id,
    used_at: usedAt,
  } satisfies IOauthServerUserPointCoupon.ICreate;

  const userPointCoupon: IOauthServerUserPointCoupon =
    await api.functional.oauthServer.admin.userPointCoupons.create(connection, {
      body: userPointCouponCreateBody,
    });
  typia.assert(userPointCoupon);

  // 4. Retrieve user point coupon details by ID
  const retrieved: IOauthServerUserPointCoupon =
    await api.functional.oauthServer.admin.userPointCoupons.at(connection, {
      id: userPointCoupon.id,
    });
  typia.assert(retrieved);

  // 5. Verify all fields match exactly
  TestValidator.equals("UserPointCoupon.id", retrieved.id, userPointCoupon.id);
  TestValidator.equals(
    "UserPointCoupon.user_id",
    retrieved.user_id,
    userPointCoupon.user_id,
  );
  TestValidator.equals(
    "UserPointCoupon.point_coupon_id",
    retrieved.point_coupon_id,
    userPointCoupon.point_coupon_id,
  );
  TestValidator.equals(
    "UserPointCoupon.used_at",
    retrieved.used_at,
    userPointCoupon.used_at,
  );
  TestValidator.equals(
    "UserPointCoupon.created_at",
    retrieved.created_at,
    userPointCoupon.created_at,
  );
  TestValidator.equals(
    "UserPointCoupon.updated_at",
    retrieved.updated_at,
    userPointCoupon.updated_at,
  );
  TestValidator.equals(
    "UserPointCoupon.deleted_at",
    retrieved.deleted_at === undefined ? null : retrieved.deleted_at,
    userPointCoupon.deleted_at === undefined
      ? null
      : userPointCoupon.deleted_at,
  );

  // 6. Test error on invalid ID
  await TestValidator.error(
    "Retrieve user point coupon with invalid ID should fail",
    async () => {
      await api.functional.oauthServer.admin.userPointCoupons.at(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 7. Test unauthorized error
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Retrieve user point coupon with unauthorized access should fail",
    async () => {
      await api.functional.oauthServer.admin.userPointCoupons.at(
        unauthorizedConnection,
        { id: userPointCoupon.id },
      );
    },
  );
}
