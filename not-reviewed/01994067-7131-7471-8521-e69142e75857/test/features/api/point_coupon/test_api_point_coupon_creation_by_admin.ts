import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";

/**
 * This E2E test validates admin coupon creation workflow including
 * prerequisites.
 *
 * It performs admin join + login, creates a coupon with valid data, verifies
 * returned data.
 *
 * Then tests duplicate coupon code rejection and various invalid inputs for
 * robust validation.
 *
 * Uses SDK-managed authentication tokens with typia.assert and TestValidator
 * assertions.
 *
 * Validates API endpoints: POST /auth/admin/join, POST /auth/admin/login, POST
 * /oauthServer/admin/pointCoupons
 *
 * Ensures business rules: unique coupon code, valid expiration format, positive
 * issuance & value constraints.
 */
export async function test_api_point_coupon_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin join
  const adminJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerAdmin.ICreate;
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinData });
  typia.assert(admin);
  TestValidator.predicate("admin email verified", admin.email_verified);

  // Step 2: Admin login
  const adminLoginData = {
    email: adminJoinData.email,
    password: adminJoinData.password,
  } satisfies IOauthServerAdmin.ILogin;
  const adminLogin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginData });
  typia.assert(adminLogin);
  TestValidator.equals(
    "admin login email equals join email",
    adminLogin.email,
    adminJoinData.email,
  );

  // Step 3: Create a new point coupon with valid data
  const couponCode = `TEST-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const nowIso = new Date().toISOString();
  const expireAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const couponCreateData = {
    code: couponCode,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    value: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    max_issuance: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    expire_at: expireAt,
  } satisfies IOauthServerPointCoupon.ICreate;

  const createdCoupon: IOauthServerPointCoupon =
    await api.functional.oauthServer.admin.pointCoupons.create(connection, {
      body: couponCreateData,
    });
  typia.assert(createdCoupon);
  TestValidator.equals(
    "coupon code returned matches input",
    createdCoupon.code,
    couponCode,
  );
  TestValidator.predicate(
    "coupon ID format UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdCoupon.id,
    ),
  );
  TestValidator.predicate(
    "coupon created_at is ISO string",
    !!createdCoupon.created_at,
  );
  TestValidator.predicate(
    "coupon updated_at is ISO string",
    !!createdCoupon.updated_at,
  );

  // Step 4: Attempt duplicate coupon code creation - expect error
  await TestValidator.error(
    "duplicate coupon code creation throws error",
    async () => {
      const duplicateCreateData = {
        ...couponCreateData,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IOauthServerPointCoupon.ICreate;
      await api.functional.oauthServer.admin.pointCoupons.create(connection, {
        body: duplicateCreateData,
      });
    },
  );

  // Step 5: Test invalid coupon creation inputs
  // Invalid empty coupon code
  await TestValidator.error("empty coupon code rejected", async () => {
    const invalidData = {
      ...couponCreateData,
      code: "",
    } satisfies IOauthServerPointCoupon.ICreate;
    await api.functional.oauthServer.admin.pointCoupons.create(connection, {
      body: invalidData,
    });
  });

  // Invalid zero value
  await TestValidator.error("zero value rejected", async () => {
    const invalidData = {
      ...couponCreateData,
      value: 0,
    } satisfies IOauthServerPointCoupon.ICreate;
    await api.functional.oauthServer.admin.pointCoupons.create(connection, {
      body: invalidData,
    });
  });

  // Invalid negative max_issuance
  await TestValidator.error("negative max_issuance rejected", async () => {
    const invalidData = {
      ...couponCreateData,
      max_issuance: -10,
    } satisfies IOauthServerPointCoupon.ICreate;
    await api.functional.oauthServer.admin.pointCoupons.create(connection, {
      body: invalidData,
    });
  });

  // Invalid expiration date format
  await TestValidator.error("invalid expiration date rejected", async () => {
    const invalidData = {
      ...couponCreateData,
      expire_at: "not-a-date",
    } satisfies IOauthServerPointCoupon.ICreate;
    await api.functional.oauthServer.admin.pointCoupons.create(connection, {
      body: invalidData,
    });
  });
}
