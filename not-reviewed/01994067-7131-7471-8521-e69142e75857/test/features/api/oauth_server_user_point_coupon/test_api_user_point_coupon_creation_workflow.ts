import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";
import type { IOauthServerUserPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointCoupon";

export async function test_api_user_point_coupon_creation_workflow(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "StrongPassword123";
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create multiple point coupons
  const coupons: IOauthServerPointCoupon[] = [];
  for (let i = 0; i < 3; i++) {
    const now = new Date();
    const expireAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days later
    const couponCode = `${RandomGenerator.alphaNumeric(10).toUpperCase()}${i}`;
    const couponBody = {
      code: couponCode,
      description: `Test coupon ${i + 1}`,
      value: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      max_issuance: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1>
      >(),
      expire_at: expireAt.toISOString(),
    } satisfies IOauthServerPointCoupon.ICreate;

    const coupon: IOauthServerPointCoupon =
      await api.functional.oauthServer.admin.pointCoupons.create(connection, {
        body: couponBody,
      });
    typia.assert(coupon);
    coupons.push(coupon);
  }

  // 3. Create user point coupon usage records
  const userPointCoupons: IOauthServerUserPointCoupon[] = [];
  for (let i = 0; i < coupons.length; i++) {
    const usageBody = {
      user_id: typia.random<string & tags.Format<"uuid">>(),
      point_coupon_id: coupons[i].id,
      used_at: new Date().toISOString(),
    } satisfies IOauthServerUserPointCoupon.ICreate;

    const userPointCoupon: IOauthServerUserPointCoupon =
      await api.functional.oauthServer.admin.userPointCoupons.create(
        connection,
        {
          body: usageBody,
        },
      );
    typia.assert(userPointCoupon);
    userPointCoupons.push(userPointCoupon);
  }

  // 4. Test error scenario invalid user_id
  await TestValidator.error("invalid user_id should cause error", async () => {
    await api.functional.oauthServer.admin.userPointCoupons.create(connection, {
      body: {
        user_id: "00000000-0000-0000-0000-000000000000",
        point_coupon_id: coupons[0].id,
        used_at: new Date().toISOString(),
      } satisfies IOauthServerUserPointCoupon.ICreate,
    });
  });

  // 5. Test error scenario invalid point_coupon_id
  await TestValidator.error(
    "invalid point_coupon_id should cause error",
    async () => {
      await api.functional.oauthServer.admin.userPointCoupons.create(
        connection,
        {
          body: {
            user_id: typia.random<string & tags.Format<"uuid">>(),
            point_coupon_id: "00000000-0000-0000-0000-000000000000",
            used_at: new Date().toISOString(),
          } satisfies IOauthServerUserPointCoupon.ICreate,
        },
      );
    },
  );
}
