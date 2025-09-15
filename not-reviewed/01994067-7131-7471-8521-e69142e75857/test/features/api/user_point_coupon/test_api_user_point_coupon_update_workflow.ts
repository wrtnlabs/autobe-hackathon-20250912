import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";
import type { IOauthServerUserPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointCoupon";

export async function test_api_user_point_coupon_update_workflow(
  connection: api.IConnection,
) {
  // 1. Admin authentication using join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "password1234",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a point coupon
  const couponCode = ArrayUtil.repeat(8, () =>
    RandomGenerator.alphaNumeric(1),
  ).join("");
  const expireAt = new Date(Date.now() + 86400 * 1000 * 30).toISOString();
  const pointCoupon: IOauthServerPointCoupon =
    await api.functional.oauthServer.admin.pointCoupons.create(connection, {
      body: {
        code: couponCode,
        description: "Test coupon description",
        value: 100,
        max_issuance: 10,
        expire_at: expireAt,
      } satisfies IOauthServerPointCoupon.ICreate,
    });
  typia.assert(pointCoupon);

  // 3. Create a user point coupon record
  const usedAtInitial = new Date(Date.now() - 86400 * 1000).toISOString();
  const userPointCoupon: IOauthServerUserPointCoupon =
    await api.functional.oauthServer.admin.userPointCoupons.create(connection, {
      body: {
        point_coupon_id: pointCoupon.id,
        user_id: admin.id,
        used_at: usedAtInitial,
      } satisfies IOauthServerUserPointCoupon.ICreate,
    });
  typia.assert(userPointCoupon);

  // 4. Update the user point coupon record
  const usedAtUpdated = new Date(Date.now()).toISOString();
  const updateBody: IOauthServerUserPointCoupon.IUpdate = {
    used_at: usedAtUpdated,
    // For test, change coupon id to the same value (optional) or omit
    // We omit user_id and point_coupon_id for partial update testing
  };
  const updatedUserPointCoupon: IOauthServerUserPointCoupon =
    await api.functional.oauthServer.admin.userPointCoupons.update(connection, {
      id: userPointCoupon.id,
      body: updateBody,
    });
  typia.assert(updatedUserPointCoupon);

  // Validate update reflected
  TestValidator.equals(
    "update used_at field",
    updatedUserPointCoupon.used_at,
    usedAtUpdated,
  );
  TestValidator.equals(
    "id preserved after update",
    updatedUserPointCoupon.id,
    userPointCoupon.id,
  );
  TestValidator.equals(
    "user_id preserved after update",
    updatedUserPointCoupon.user_id,
    userPointCoupon.user_id,
  );
  TestValidator.equals(
    "point_coupon_id preserved after update",
    updatedUserPointCoupon.point_coupon_id,
    userPointCoupon.point_coupon_id,
  );

  // 5. Attempt invalid update: unauthorized (simulate by new connection without admin)
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update attempt", async () => {
    await api.functional.oauthServer.admin.userPointCoupons.update(
      unauthorizedConn,
      {
        id: userPointCoupon.id,
        body: {
          used_at: new Date(Date.now() - 10000).toISOString(),
        },
      },
    );
  });

  // 6. Attempt update with invalid data - test with valid types but logically invalid data
  // For example: future used_at after expiration of the coupon
  // The expire_at and used_at are respected for logic, but we don't have an API to confirm error detail
  const invalidUsedAt = new Date(Date.now() + 86400 * 1000 * 60).toISOString(); // 60 days future
  await TestValidator.error(
    "update with used_at after coupon expiration should fail",
    async () => {
      await api.functional.oauthServer.admin.userPointCoupons.update(
        connection,
        {
          id: userPointCoupon.id,
          body: {
            used_at: invalidUsedAt,
          },
        },
      );
    },
  );
}
