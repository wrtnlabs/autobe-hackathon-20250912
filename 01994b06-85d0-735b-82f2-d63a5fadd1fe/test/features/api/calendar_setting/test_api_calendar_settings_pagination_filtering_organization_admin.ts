import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformCalendarSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformCalendarSetting";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformCalendarSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformCalendarSetting";

/**
 * Validate retrieval of calendar settings (paginated, filtered) as an
 * authenticated organization admin
 *
 * Steps:
 *
 * 1. Register a new organization admin (POST /auth/organizationAdmin/join)
 * 2. Login as that admin (POST /auth/organizationAdmin/login)
 * 3. Call organization admin calendar settings index (PATCH
 *    /healthcarePlatform/organizationAdmin/calendarSettings) with: a. normal
 *    pagination (e.g., page 0, limit 5) b. out-of-bound page (extremely high
 *    page number) c. filtering by non-existent resource_id
 * 4. Try the calendar settings index call without authentication – expect error
 * 5. Validate response pagination, empty results for out-of-bound or missing
 *    filter matches, error for no auth
 */
export async function test_api_calendar_settings_pagination_filtering_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: adminJoinInput },
  );
  typia.assert(adminAuth);

  // 2. Login as admin (simulate token refresh and test full login flow)
  const loginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginInput },
  );
  typia.assert(adminLogin);

  // 3a. Retrieve calendar settings normally (pagination)
  const settingsNormal =
    await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.index(
      connection,
      {
        body: {
          page: 0, // first page
          limit: 5,
        } satisfies IHealthcarePlatformCalendarSetting.IRequest,
      },
    );
  typia.assert(settingsNormal);
  TestValidator.predicate(
    "pagination current page is 0 on normal query",
    settingsNormal.pagination.current === 0,
  );
  TestValidator.predicate(
    "pagination limit <= 5",
    settingsNormal.pagination.limit <= 5,
  );
  TestValidator.predicate(
    "pagination records >= data.length",
    settingsNormal.pagination.records >= settingsNormal.data.length,
  );
  TestValidator.predicate(
    "pagination pages > 0",
    settingsNormal.pagination.pages > 0,
  );
  TestValidator.predicate(
    "data property is array",
    Array.isArray(settingsNormal.data),
  );

  // 3b. Out-of-bounds page (very large page number)
  const settingsOOB =
    await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.index(
      connection,
      {
        body: {
          page: 99999,
          limit: 10,
        } satisfies IHealthcarePlatformCalendarSetting.IRequest,
      },
    );
  typia.assert(settingsOOB);
  TestValidator.predicate(
    "out-of-bounds calendar settings page returns empty data",
    settingsOOB.data.length === 0 || settingsOOB.pagination.current === 99999,
  );

  // 3c. Filtering with a random resource_id (which doesn't exist)
  const fakeResourceId = typia.random<string & tags.Format<"uuid">>();
  const settingsFiltered =
    await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.index(
      connection,
      {
        body: {
          resource_id: fakeResourceId,
          limit: 5,
          page: 0,
        } satisfies IHealthcarePlatformCalendarSetting.IRequest,
      },
    );
  typia.assert(settingsFiltered);
  TestValidator.equals(
    "filtered by nonexistent resource_id returns empty",
    settingsFiltered.data.length,
    0,
  );

  // 4. Try unauthenticated call (fresh connection instance w/o headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "returns error if organization admin missing auth token",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.index(
        unauthConn,
        {
          body: {
            page: 0,
            limit: 1,
          } satisfies IHealthcarePlatformCalendarSetting.IRequest,
        },
      );
    },
  );
}
