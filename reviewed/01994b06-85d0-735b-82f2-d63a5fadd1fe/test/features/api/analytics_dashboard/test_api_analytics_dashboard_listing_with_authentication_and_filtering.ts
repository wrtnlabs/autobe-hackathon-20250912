import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsDashboard";

/**
 * End-to-end test for listing analytics dashboards as system admin,
 * covering all business logic edge cases and positive/negative
 * authentication.
 *
 * 1. Register a healthcare platform system admin.
 * 2. Login as the same admin and assert token/identity.
 * 3. Create at least one (preferably two) dashboards owned by this admin in a
 *    random organization.
 * 4. List dashboards (PATCH) filtered by owner_user_id, with pagination (page
 *    1, limit 2).
 * 5. Assert the returned page summaries all reference the correct owner and
 *    organization, pagination fields are correct, and fields are valid.
 * 6. List dashboards filtered to a random non-existent owner id, and assert
 *    data array is empty, records/pages=0.
 * 7. List dashboards with a very high page number (e.g., 1000), and assert
 *    data array is empty, pagination.page>=expected.
 * 8. Attempt to list dashboards using an unauthenticated connection (no
 *    token), expect error.
 */
export async function test_api_analytics_dashboard_listing_with_authentication_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Register as system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "SecurePassword!1",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  // Step 2: Login as admin
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysAdminEmail,
        provider: "local",
        provider_key: sysAdminEmail,
        password: "SecurePassword!1",
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminLogin);
  TestValidator.equals(
    "login admin id matches join",
    sysAdminLogin.id,
    sysAdminJoin.id,
  );

  // Step 3: Create two dashboards for this admin
  const organization_id = typia.random<string & tags.Format<"uuid">>();
  const dashboard1 =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: sysAdminLogin.id,
          organization_id,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          config_json: JSON.stringify({ layout: "A" }),
          is_public: true,
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard1);

  const dashboard2 =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: sysAdminLogin.id,
          organization_id,
          title: RandomGenerator.paragraph({ sentences: 4 }),
          config_json: JSON.stringify({ layout: "B" }),
          is_public: false,
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard2);

  // Step 4: List dashboards filtered by owner_user_id and organization_id, page 1, limit 2
  const listResponse =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.index(
      connection,
      {
        body: {
          owner_user_id: sysAdminLogin.id,
          organization_id,
          page: 1,
          limit: 2,
        } satisfies IHealthcarePlatformAnalyticsDashboard.IRequest,
      },
    );
  typia.assert(listResponse);
  TestValidator.predicate(
    "list contains at least the two created dashboards",
    listResponse.data.length >= 2,
  );
  for (const summary of listResponse.data) {
    TestValidator.equals(
      "owner user id matches filter",
      summary.owner_user_id,
      sysAdminLogin.id,
    );
    TestValidator.equals(
      "organization id matches filter",
      summary.organization_id,
      organization_id,
    );
  }
  TestValidator.equals(
    "pagination page is 1",
    listResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", listResponse.pagination.limit, 2);

  // Step 5: List dashboards with random owner_user_id that matches no dashboard
  const nonExistentOwnerId = typia.random<string & tags.Format<"uuid">>();
  const noDashboards =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.index(
      connection,
      {
        body: {
          owner_user_id: nonExistentOwnerId,
          organization_id,
          page: 1,
          limit: 2,
        } satisfies IHealthcarePlatformAnalyticsDashboard.IRequest,
      },
    );
  typia.assert(noDashboards);
  TestValidator.equals(
    "no dashboards returned for random owner",
    noDashboards.data.length,
    0,
  );
  TestValidator.equals("records is zero", noDashboards.pagination.records, 0);
  TestValidator.equals("pages is zero", noDashboards.pagination.pages, 0);

  // Step 6: List dashboards with very high page number
  const highPage = 1000;
  const highPageDashboards =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.index(
      connection,
      {
        body: {
          owner_user_id: sysAdminLogin.id,
          organization_id,
          page: highPage,
          limit: 2,
        } satisfies IHealthcarePlatformAnalyticsDashboard.IRequest,
      },
    );
  typia.assert(highPageDashboards);
  TestValidator.equals(
    "high page returns empty data",
    highPageDashboards.data.length,
    0,
  );
  TestValidator.predicate(
    "high page current >= requested page",
    highPageDashboards.pagination.current >= highPage,
  );

  // Step 7: Attempt unauthenticated dashboard list (no Authorization header)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request is rejected", async () => {
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.index(
      unauthConnection,
      {
        body: {
          owner_user_id: sysAdminLogin.id,
          organization_id,
          page: 1,
          limit: 2,
        } satisfies IHealthcarePlatformAnalyticsDashboard.IRequest,
      },
    );
  });
}
