import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";
import type { IOauthServerUserPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerUserPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerUserPointCoupon";

/**
 * This test scenario verifies the ability to search and retrieve a paginated
 * list of user point coupon usage records through the
 * /oauthServer/admin/userPointCoupons PATCH endpoint. It tests the complete
 * workflow from authentication of an admin user, to creation of user point
 * coupons for relevant users and coupons, and finally retrieval of paginated
 * search results filtered by user ID and coupon ID. The scenario includes
 * validation of pagination metadata and correctness of filtered results
 * matching the search criteria.
 *
 * Steps:
 *
 * 1. Authenticate as an admin user to gain access.
 * 2. Create multiple point coupons with unique codes and descriptions.
 * 3. Create multiple user point coupon entries associating distinct users with the
 *    created coupons, with valid used_at timestamps.
 * 4. Conduct a paginated, filtered search using a selected user ID and coupon ID
 *    as filter criteria.
 * 5. Validate the response contains only records matching the filters, that
 *    pagination parameters are respected, and that data integrity holds.
 * 6. Additionally test edge cases such as empty results for non-existent user ID,
 *    invalid (null) user ID and coupon ID filters, and excessive pagination
 *    limit parameters to ensure robust error handling and graceful responses.
 *
 * Expected outcomes include successful authentication, correct creation of
 * coupons and user point coupons, accurate search results, and appropriate
 * handling of edge cases. Business logic validations include enforcement of
 * user and coupon existence, filtering correctness, and pagination behavior.
 *
 * This scenario assures full integration and correctness of the user point
 * coupon search functionality, critical for administrative operations and user
 * reward management.
 */
export async function test_api_user_point_coupon_search_paginated_filtered(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "password123",
      },
    });
  typia.assert(admin);

  // 2. Create 3 point coupons
  const coupons: IOauthServerPointCoupon[] = [];
  for (let i = 0; i < 3; i++) {
    const couponBody = {
      code: `CODE${Date.now()}_${i}`,
      description: `Description for coupon ${i}`,
      value: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
      max_issuance: 100 + i * 10,
      expire_at: new Date(Date.now() + 86400000 * (i + 10)).toISOString(),
    } satisfies IOauthServerPointCoupon.ICreate;
    const createdCoupon =
      await api.functional.oauthServer.admin.pointCoupons.create(connection, {
        body: couponBody,
      });
    typia.assert(createdCoupon);
    coupons.push(createdCoupon);
  }

  // 3. Create 5 user point coupons associating unique user_ids with created coupons
  const userPointCoupons: IOauthServerUserPointCoupon[] = [];
  for (let i = 0; i < 5; i++) {
    const coupon = coupons[i % coupons.length];
    const userPointCouponBody = {
      user_id: typia.random<string & tags.Format<"uuid">>(),
      point_coupon_id: coupon.id,
      used_at: new Date().toISOString(),
    } satisfies IOauthServerUserPointCoupon.ICreate;
    const createdUserPointCoupon =
      await api.functional.oauthServer.admin.userPointCoupons.create(
        connection,
        { body: userPointCouponBody },
      );
    typia.assert(createdUserPointCoupon);
    userPointCoupons.push(createdUserPointCoupon);
  }

  // Select a user_id and point_coupon_id for filtered search
  const filteredUserId = userPointCoupons[0].user_id;
  const filteredCouponId = userPointCoupons[0].point_coupon_id;

  // 4. Search user point coupons with filters and pagination
  const searchRequest = {
    page: 1,
    limit: 10,
    user_id: filteredUserId,
    point_coupon_id: filteredCouponId,
  } satisfies IOauthServerUserPointCoupon.IRequest;
  const pageResult: IPageIOauthServerUserPointCoupon =
    await api.functional.oauthServer.admin.userPointCoupons.index(connection, {
      body: searchRequest,
    });
  typia.assert(pageResult);

  // 5. Validate pagination metadata
  TestValidator.predicate("page > 0", pageResult.pagination.current > 0);
  TestValidator.predicate("limit > 0", pageResult.pagination.limit > 0);
  TestValidator.predicate("pages >= 0", pageResult.pagination.pages >= 0);

  // 6. Validate all results match filter
  TestValidator.predicate(
    "all user_ids match filter",
    pageResult.data.every((item) => item.user_id === filteredUserId),
  );

  TestValidator.predicate(
    "all point_coupon_ids match filter",
    pageResult.data.every((item) => item.point_coupon_id === filteredCouponId),
  );

  // Edge case 1: Empty results for non-existent filters
  const emptySearchRequest = {
    page: 1,
    limit: 10,
    user_id: typia.random<string & tags.Format<"uuid">>(),
    point_coupon_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IOauthServerUserPointCoupon.IRequest;
  const emptyResult =
    await api.functional.oauthServer.admin.userPointCoupons.index(connection, {
      body: emptySearchRequest,
    });
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result for non-existent filters",
    emptyResult.data.length,
    0,
  );

  // Edge case 2: Null filters (should return matched properly or all if nullable allowed)
  const nullFiltersRequest = {
    page: 1,
    limit: 10,
    user_id: null,
    point_coupon_id: null,
  } satisfies IOauthServerUserPointCoupon.IRequest;
  const nullFiltersResult =
    await api.functional.oauthServer.admin.userPointCoupons.index(connection, {
      body: nullFiltersRequest,
    });
  typia.assert(nullFiltersResult);
  TestValidator.predicate(
    "pagination valid for null filters",
    nullFiltersResult.pagination.current === 1,
  );

  // Edge case 3: Excessive page size (limit)
  const largeLimitRequest = {
    page: 1,
    limit: 1000,
    user_id: filteredUserId,
  } satisfies IOauthServerUserPointCoupon.IRequest;
  const largeLimitResult =
    await api.functional.oauthServer.admin.userPointCoupons.index(connection, {
      body: largeLimitRequest,
    });
  typia.assert(largeLimitResult);
  TestValidator.predicate(
    "large limit respected",
    largeLimitResult.pagination.limit === 1000 ||
      largeLimitResult.pagination.limit < 1000,
  );
}
