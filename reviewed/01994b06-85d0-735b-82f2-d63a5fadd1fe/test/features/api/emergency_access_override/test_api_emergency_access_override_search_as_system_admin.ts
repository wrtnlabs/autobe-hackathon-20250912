import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEmergencyAccessOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEmergencyAccessOverride";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEmergencyAccessOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEmergencyAccessOverride";

/**
 * System admin can search emergency access override logs with a variety of
 * filters and scenarios.
 *
 * 1. Register a platform system admin (POST /auth/systemAdmin/join) and
 *    capture credentials.
 * 2. Log in as system admin (POST /auth/systemAdmin/login) to get access token
 *    for API calls.
 * 3. (Test data must exist) - Ensure at least 2+ EmergencyAccessOverride
 *    records (simulate by attempting multiple queries with distinct filters
 *    to stress pagination/filtering; in formal seeding, might require DB
 *    seed, here assume some records exist).
 * 4. Issue PATCH /healthcarePlatform/systemAdmin/emergencyAccessOverrides with
 *    no filters, expect paginated results.
 * 5. Issue PATCH with filter by organization_id (pick from returned data or
 *    generate a UUID certain not to exist) - expect filtered result
 *    (possibly empty for fake org, non-empty for in-use org).
 * 6. Issue PATCH with filter by user_id and/or reviewed_by_user_id - verify
 *    filtered records correspond to the input criteria.
 * 7. Issue PATCH with time window filters (choose override_start_at_from/to,
 *    reviewed_at_from/to from valid data) - verify records' timestamps fall
 *    within window.
 * 8. Confirm pagination is correct (page, page_size respond as expected).
 * 9. Error case: supply a non-existent org/user filter and confirm empty
 *    result (not HttpError).
 * 10. Error case: omit or corrupt auth token and confirm server responds with
 *     HttpError (interpreted by SDK as error/exception).
 */
export async function test_api_emergency_access_override_search_as_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@company.com`,
    full_name: RandomGenerator.name(2),
    provider: "local",
    provider_key: `${RandomGenerator.alphabets(8)}@company.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Login as system admin (redundant for join, but checks login logic)
  const adminLoginBody = {
    email: adminJoinBody.email,
    provider: "local",
    provider_key: adminJoinBody.provider_key,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminAuth = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminAuth);

  // 3. Fetch override logs w/ no filter (should get some test data back, or at minimum an empty list).
  const page1 =
    await api.functional.healthcarePlatform.systemAdmin.emergencyAccessOverrides.index(
      connection,
      {
        body: {
          page: 1,
          page_size: 5,
        } satisfies IHealthcarePlatformEmergencyAccessOverride.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "first page pagination works",
    page1.pagination.current === 1 && page1.pagination.limit === 5,
  );

  // 4. Try organization_id/user_id/reviewed_by_user_id filter (if there is at least one record)
  let foundOrgId: string | undefined;
  let foundUserId: string | undefined;
  let foundReviewedByUserId: string | undefined;
  if (page1.data.length > 0) {
    foundOrgId = page1.data[0].organization_id;
    foundUserId = page1.data[0].user_id;
    foundReviewedByUserId = page1.data[0].reviewed_by_user_id || undefined;
  }
  // 5. Filter by found organization_id
  if (foundOrgId) {
    const orgFiltered =
      await api.functional.healthcarePlatform.systemAdmin.emergencyAccessOverrides.index(
        connection,
        {
          body: {
            organization_id: foundOrgId,
            page: 1,
            page_size: 5,
          } satisfies IHealthcarePlatformEmergencyAccessOverride.IRequest,
        },
      );
    typia.assert(orgFiltered);
    TestValidator.equals(
      "organization_id filter returns only records for that org",
      orgFiltered.data.every((r) => r.organization_id === foundOrgId),
      true,
    );
  }
  // 6. Filter by found user_id
  if (foundUserId) {
    const userFiltered =
      await api.functional.healthcarePlatform.systemAdmin.emergencyAccessOverrides.index(
        connection,
        {
          body: {
            user_id: foundUserId,
            page: 1,
            page_size: 5,
          } satisfies IHealthcarePlatformEmergencyAccessOverride.IRequest,
        },
      );
    typia.assert(userFiltered);
    TestValidator.equals(
      "user_id filter returns only records for that user",
      userFiltered.data.every((r) => r.user_id === foundUserId),
      true,
    );
  }
  // 7. Filter by found reviewed_by_user_id
  if (foundReviewedByUserId) {
    const revFiltered =
      await api.functional.healthcarePlatform.systemAdmin.emergencyAccessOverrides.index(
        connection,
        {
          body: {
            reviewed_by_user_id: foundReviewedByUserId,
            page: 1,
            page_size: 5,
          } satisfies IHealthcarePlatformEmergencyAccessOverride.IRequest,
        },
      );
    typia.assert(revFiltered);
    TestValidator.equals(
      "reviewer filter returns only records reviewed by that user",
      revFiltered.data.every(
        (r) => r.reviewed_by_user_id === foundReviewedByUserId,
      ),
      true,
    );
  }
  // 8. Time window filter: pick override_start_at_from/to from an existing record if possible
  if (page1.data.length > 0) {
    const overrideSample = page1.data[0];
    const startFrom = overrideSample.override_start_at;
    const startTo = overrideSample.override_start_at;
    const timeFiltered =
      await api.functional.healthcarePlatform.systemAdmin.emergencyAccessOverrides.index(
        connection,
        {
          body: {
            override_start_at_from: startFrom,
            override_start_at_to: startTo,
            page: 1,
            page_size: 5,
          } satisfies IHealthcarePlatformEmergencyAccessOverride.IRequest,
        },
      );
    typia.assert(timeFiltered);
    TestValidator.predicate(
      "override_start_at range result in-bounds",
      timeFiltered.data.every(
        (r) =>
          r.override_start_at >= startFrom && r.override_start_at <= startTo,
      ),
    );
  }
  // 9. Pagination: fetch page 2
  const page2 =
    await api.functional.healthcarePlatform.systemAdmin.emergencyAccessOverrides.index(
      connection,
      {
        body: {
          page: 2,
          page_size: 5,
        } satisfies IHealthcarePlatformEmergencyAccessOverride.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "pagination advances page (may be empty)",
    page2.pagination.current,
    2,
  );

  // 10. Filtering with a non-existent org/user: must yield empty data
  const fakeOrgId = typia.random<string & tags.Format<"uuid">>();
  const fakeUserId = typia.random<string & tags.Format<"uuid">>();
  const noOrg =
    await api.functional.healthcarePlatform.systemAdmin.emergencyAccessOverrides.index(
      connection,
      {
        body: {
          organization_id: fakeOrgId,
          page: 1,
          page_size: 5,
        } satisfies IHealthcarePlatformEmergencyAccessOverride.IRequest,
      },
    );
  typia.assert(noOrg);
  TestValidator.equals(
    "non-existent org yields empty result",
    noOrg.data.length,
    0,
  );
  const noUser =
    await api.functional.healthcarePlatform.systemAdmin.emergencyAccessOverrides.index(
      connection,
      {
        body: {
          user_id: fakeUserId,
          page: 1,
          page_size: 5,
        } satisfies IHealthcarePlatformEmergencyAccessOverride.IRequest,
      },
    );
  typia.assert(noUser);
  TestValidator.equals(
    "non-existent user yields empty result",
    noUser.data.length,
    0,
  );
  // 11. Error case: missing or malformed auth token
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "auth required for override log search",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.emergencyAccessOverrides.index(
        unauthConn,
        {
          body: {
            page: 1,
            page_size: 5,
          } satisfies IHealthcarePlatformEmergencyAccessOverride.IRequest,
        },
      );
    },
  );
}
