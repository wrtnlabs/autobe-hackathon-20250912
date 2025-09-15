import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerPointCoupon";

export async function test_api_point_coupons_list_with_filters(
  connection: api.IConnection,
) {
  // 1. Member registration and authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(member);

  // 2. List coupons without filters
  const allCoupons: IPageIOauthServerPointCoupon =
    await api.functional.oauthServer.member.pointCoupons.index(connection, {
      body: {},
    });
  typia.assert(allCoupons);
  TestValidator.predicate(
    "pagination has positive pages",
    allCoupons.pagination.pages > 0,
  );

  // 3. Filter by partial code substring
  const codeSample =
    allCoupons.data.length > 0 ? allCoupons.data[0].code.substring(0, 2) : "A1";
  const filteredByCode: IPageIOauthServerPointCoupon =
    await api.functional.oauthServer.member.pointCoupons.index(connection, {
      body: {
        code: codeSample,
      } satisfies IOauthServerPointCoupon.IRequest,
    });
  typia.assert(filteredByCode);
  TestValidator.predicate(
    "filtered coupons only with code substring",
    filteredByCode.data.every((coupon) => coupon.code.includes(codeSample)),
  );

  // 4. Filter by expire_at_from (coupons expiring from date)
  if (allCoupons.data.length > 0) {
    const expireFrom = allCoupons.data[0].expire_at;
    const filteredByExpireFrom: IPageIOauthServerPointCoupon =
      await api.functional.oauthServer.member.pointCoupons.index(connection, {
        body: {
          expire_at_from: expireFrom,
        } satisfies IOauthServerPointCoupon.IRequest,
      });
    typia.assert(filteredByExpireFrom);
    TestValidator.predicate(
      "coupons expire_at are from expire_at_from onwards",
      filteredByExpireFrom.data.every(
        (coupon) => coupon.expire_at >= expireFrom,
      ),
    );
  }

  // 5. Filter by expire_at_to (coupons expiring up to date)
  if (allCoupons.data.length > 0) {
    const expireTo = allCoupons.data[allCoupons.data.length - 1].expire_at;
    const filteredByExpireTo: IPageIOauthServerPointCoupon =
      await api.functional.oauthServer.member.pointCoupons.index(connection, {
        body: {
          expire_at_to: expireTo,
        } satisfies IOauthServerPointCoupon.IRequest,
      });
    typia.assert(filteredByExpireTo);
    TestValidator.predicate(
      "coupons expire_at are up to expire_at_to",
      filteredByExpireTo.data.every((coupon) => coupon.expire_at <= expireTo),
    );
  }

  // 6. Combined filters: code and expiration date range
  if (allCoupons.data.length > 1) {
    const combinedCode = allCoupons.data[0].code.substring(0, 1);
    const combinedFrom = allCoupons.data[0].expire_at;
    const combinedTo = allCoupons.data[allCoupons.data.length - 1].expire_at;
    const filteredCombined: IPageIOauthServerPointCoupon =
      await api.functional.oauthServer.member.pointCoupons.index(connection, {
        body: {
          code: combinedCode,
          expire_at_from: combinedFrom,
          expire_at_to: combinedTo,
        } satisfies IOauthServerPointCoupon.IRequest,
      });
    typia.assert(filteredCombined);
    TestValidator.predicate(
      "combined filter coupons have matching code",
      filteredCombined.data.every((c) => c.code.includes(combinedCode)),
    );
    TestValidator.predicate(
      "combined filter coupons expire_at within range",
      filteredCombined.data.every(
        (c) => c.expire_at >= combinedFrom && c.expire_at <= combinedTo,
      ),
    );
  }
}
