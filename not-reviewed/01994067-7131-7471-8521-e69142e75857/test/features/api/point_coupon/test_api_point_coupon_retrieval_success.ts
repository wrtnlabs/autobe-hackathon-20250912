import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";

/**
 * Validate the successful retrieval of point coupon details by a developer
 * user.
 *
 * This test performs the complete workflow for multi-role authentication and
 * authorization:
 *
 * 1. Admin user registration and login for point coupon management.
 * 2. Developer user registration and login for coupon detail retrieval.
 * 3. Admin user creates a point coupon with valid and realistic data.
 * 4. Developer user fetches the point coupon details by the coupon ID.
 * 5. Verifies that the fetched coupon data matches exactly the created coupon.
 *
 * This scenario ensures correct access permission handling and verifies that
 * detailed point coupon data is accurately retrievable by authorized developer
 * users.
 *
 * It does not test error/unauthorized cases but focuses on the success flow.
 * All data respects format and business constraints ensuring trustworthy
 * tests.
 */
export async function test_api_point_coupon_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "SecurePass123!",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin user login
  const adminLogin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!",
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Developer user registration
  const devEmail = typia.random<string & tags.Format<"email">>();
  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: devEmail,
        email_verified: true,
        password_hash: "DevPass123!",
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(developer);

  // 4. Developer user login
  const developerLogin: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: devEmail,
        password: "DevPass123!",
      } satisfies IOauthServerDeveloper.ILogin,
    });
  typia.assert(developerLogin);

  // 5. Admin creates a point coupon
  const couponCode = `SAVE${RandomGenerator.alphabets(5).toUpperCase()}`;
  const now = new Date();
  const expireDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days from now
  const createBody = {
    code: couponCode,
    description: "Test coupon for 30 days validity",
    value: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    max_issuance: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    expire_at: expireDate.toISOString(),
  } satisfies IOauthServerPointCoupon.ICreate;

  const createdCoupon: IOauthServerPointCoupon =
    await api.functional.oauthServer.admin.pointCoupons.create(connection, {
      body: createBody,
    });
  typia.assert(createdCoupon);

  // 6. Developer fetches point coupon details by id
  const fetchedCoupon: IOauthServerPointCoupon =
    await api.functional.oauthServer.developer.pointCoupons.at(connection, {
      id: createdCoupon.id,
    });
  typia.assert(fetchedCoupon);

  // 7. Assert that fetched coupon matches created coupon
  TestValidator.equals("coupon id matches", fetchedCoupon.id, createdCoupon.id);
  TestValidator.equals(
    "coupon code matches",
    fetchedCoupon.code,
    createdCoupon.code,
  );
  TestValidator.equals(
    "coupon description matches",
    fetchedCoupon.description,
    createdCoupon.description,
  );
  TestValidator.equals(
    "coupon value matches",
    fetchedCoupon.value,
    createdCoupon.value,
  );
  TestValidator.equals(
    "coupon max issuance matches",
    fetchedCoupon.max_issuance,
    createdCoupon.max_issuance,
  );
  TestValidator.equals(
    "coupon expire_at matches",
    fetchedCoupon.expire_at,
    createdCoupon.expire_at,
  );
  TestValidator.equals(
    "coupon created_at matches",
    fetchedCoupon.created_at,
    createdCoupon.created_at,
  );
  TestValidator.equals(
    "coupon updated_at matches",
    fetchedCoupon.updated_at,
    createdCoupon.updated_at,
  );
  TestValidator.equals(
    "coupon deleted_at matches",
    fetchedCoupon.deleted_at ?? null,
    createdCoupon.deleted_at ?? null,
  );
}
