import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";

export async function test_api_point_coupon_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as admin
  // Generate admin email for uniqueness
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "AdminPass123!",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a point coupon
  const newCouponCreate = {
    code: `TEST-${RandomGenerator.alphaNumeric(8)}`,
    description: null,
    value: typia.random<number & tags.Type<"int32">>(),
    max_issuance: typia.random<number & tags.Type<"int32">>(),
    expire_at: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
  } satisfies IOauthServerPointCoupon.ICreate;

  const createdCoupon: IOauthServerPointCoupon =
    await api.functional.oauthServer.admin.pointCoupons.create(connection, {
      body: newCouponCreate,
    });
  typia.assert(createdCoupon);

  // 3. Retrieve the coupon detail
  const retrievedCoupon: IOauthServerPointCoupon =
    await api.functional.oauthServer.admin.pointCoupons.at(connection, {
      id: createdCoupon.id,
    });
  typia.assert(retrievedCoupon);

  // 4. Validate all important data matches
  TestValidator.equals("Coupon ID", retrievedCoupon.id, createdCoupon.id);
  TestValidator.equals("Coupon code", retrievedCoupon.code, createdCoupon.code);
  TestValidator.equals(
    "Coupon description",
    retrievedCoupon.description,
    createdCoupon.description,
  );
  TestValidator.equals(
    "Coupon value",
    retrievedCoupon.value,
    createdCoupon.value,
  );
  TestValidator.equals(
    "Coupon max issuance",
    retrievedCoupon.max_issuance,
    createdCoupon.max_issuance,
  );
  TestValidator.equals(
    "Coupon expire_at",
    retrievedCoupon.expire_at,
    createdCoupon.expire_at,
  );
  TestValidator.predicate(
    "Coupon created_at is ISO string",
    typeof retrievedCoupon.created_at === "string" &&
      !Number.isNaN(Date.parse(retrievedCoupon.created_at)),
  );
  TestValidator.predicate(
    "Coupon updated_at is ISO string",
    typeof retrievedCoupon.updated_at === "string" &&
      !Number.isNaN(Date.parse(retrievedCoupon.updated_at)),
  );
  // deleted_at can be null
  TestValidator.predicate(
    "Coupon deleted_at is null or ISO string",
    retrievedCoupon.deleted_at === null ||
      (typeof retrievedCoupon.deleted_at === "string" &&
        !Number.isNaN(Date.parse(retrievedCoupon.deleted_at))) ||
      retrievedCoupon.deleted_at === undefined,
  );
}
