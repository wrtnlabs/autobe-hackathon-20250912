import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiServiceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiServiceAlert";
import type { IStoryfieldAiServiceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiServiceAlert";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * E2E test for service alert admin search, pagination, and filtering.
 *
 * Scenario:
 *
 * 1. System admin onboarding (join)
 * 2. System admin login
 * 3. Create two distinct service alerts as admin
 * 4. Search service alerts as authenticated admin (various filter/sort/pagination)
 * 5. Validate result sets and pagination correctness
 * 6. Search: empty/no-results
 * 7. Search: partial match on content/code
 * 8. Sorting and page size checks
 * 9. Confirm non-admin or unauthenticated requests are rejected
 */
export async function test_api_service_alerts_admin_search_pagination_filtering(
  connection: api.IConnection,
) {
  // 1. System admin onboarding
  const adminExternalId = RandomGenerator.alphaNumeric(12);
  const adminEmail = RandomGenerator.name(1) + "@testadmin.com";
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
      actor_type: "systemAdmin",
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Login as admin
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Create two distinct service alerts
  const alertA =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.create(
      connection,
      {
        body: {
          alert_type: "error",
          alert_code: RandomGenerator.alphaNumeric(6).toUpperCase(),
          content: RandomGenerator.paragraph({ sentences: 6 }),
          environment: "production",
          resolved: false,
          resolution_note: null,
        } satisfies IStoryfieldAiServiceAlert.ICreate,
      },
    );
  typia.assert(alertA);

  const alertB =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.create(
      connection,
      {
        body: {
          alert_type: "info",
          alert_code: RandomGenerator.alphaNumeric(6).toUpperCase(),
          content: RandomGenerator.paragraph({ sentences: 8 }),
          environment: "staging",
          resolved: true,
          resolution_note: "Issue resolved",
        } satisfies IStoryfieldAiServiceAlert.ICreate,
      },
    );
  typia.assert(alertB);

  // 4. Search all alerts, filter by type, code, environment, resolution
  // Basic: all alerts
  const pageAll =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(pageAll);
  TestValidator.predicate(
    "all created alerts are present",
    pageAll.data.some((r) => r.id === alertA.id) &&
      pageAll.data.some((r) => r.id === alertB.id),
  );

  // Filter by alert_type (should only find alertA)
  const pageErrors =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.index(
      connection,
      {
        body: { alert_types: ["error"] },
      },
    );
  typia.assert(pageErrors);
  TestValidator.equals(
    "filter by alert_type error returns only error alerts",
    pageErrors.data.length,
    pageErrors.data.filter((a) => a.alert_type === "error").length,
  );

  // Filter by exact alert_code (should find alertB only)
  const pageCode =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.index(
      connection,
      {
        body: { alert_code: alertB.alert_code },
      },
    );
  typia.assert(pageCode);
  TestValidator.equals(
    "filter by unique alert_code returns target alert only",
    pageCode.data.length,
    1,
  );
  TestValidator.equals(
    "filtered alert_code matches",
    pageCode.data[0]?.alert_code,
    alertB.alert_code,
  );

  // Filter by environment
  const pageEnv =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.index(
      connection,
      {
        body: { environment: alertA.environment },
      },
    );
  typia.assert(pageEnv);
  TestValidator.predicate(
    "filtered alerts match environment",
    pageEnv.data.every((a) => a.environment === alertA.environment),
  );

  // Filter by resolved: true (should include alertB)
  const pageResolved =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.index(
      connection,
      {
        body: { resolved: true },
      },
    );
  typia.assert(pageResolved);
  TestValidator.predicate(
    "resolved alerts include alertB",
    pageResolved.data.some((a) => a.id === alertB.id),
  );
  // Filter by resolved: false (should include alertA)
  const pageUnresolved =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.index(
      connection,
      {
        body: { resolved: false },
      },
    );
  typia.assert(pageUnresolved);
  TestValidator.predicate(
    "unresolved alerts include alertA",
    pageUnresolved.data.some((a) => a.id === alertA.id),
  );

  // 5. Pagination: set limit=1 and check paging
  const page0 =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.index(
      connection,
      {
        body: { page: 0, limit: 1 },
      },
    );
  typia.assert(page0);
  TestValidator.equals(
    "pagination: limit 1 page 0 returns 1 result",
    page0.data.length,
    1,
  );
  TestValidator.equals(
    "pagination: current page is 0",
    page0.pagination.current,
    0,
  );
  TestValidator.equals("pagination: limit is 1", page0.pagination.limit, 1);
  // Next page (page 1)
  const page1 =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.index(
      connection,
      {
        body: { page: 1, limit: 1 },
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "pagination: page 1 returns 1 result (if enough alerts)",
    page1.data.length,
    1,
  );

  // 6. Search: text search - partial content word from alertA
  const keywordA = RandomGenerator.substring(alertA.content);
  const pageSearchA =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.index(
      connection,
      {
        body: { search: keywordA },
      },
    );
  typia.assert(pageSearchA);
  TestValidator.predicate(
    "search: result contains matching alert",
    pageSearchA.data.some((a) => a.id === alertA.id),
  );

  // 7. Empty/no-result search
  const pageNone =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.index(
      connection,
      {
        body: { alert_code: "NONEXISTENTCODE" },
      },
    );
  typia.assert(pageNone);
  TestValidator.equals(
    "no-result search returns empty list",
    pageNone.data.length,
    0,
  );

  // 8. Sorting checks: sort_by 'created_at' asc/desc
  for (const order of ["asc", "desc"] as const) {
    const pageSort =
      await api.functional.storyfieldAi.systemAdmin.serviceAlerts.index(
        connection,
        {
          body: { sort_by: "created_at", sort_order: order },
        },
      );
    typia.assert(pageSort);
    const timestamps = pageSort.data.map((a) => Date.parse(a.created_at));
    const sorted =
      order === "asc"
        ? [...timestamps].sort((a, b) => a - b)
        : [...timestamps].sort((a, b) => b - a);
    TestValidator.equals(
      `sorting: created_at ${order} order`,
      timestamps,
      sorted,
    );
  }

  // 9. Unauthenticated access should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request is rejected", async () => {
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.index(
      unauthConn,
      {
        body: {},
      },
    );
  });
}
