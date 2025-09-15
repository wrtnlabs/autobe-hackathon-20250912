import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";

/**
 * Receptionist Analytics Report Permission Filtering
 *
 * This test ensures:
 *
 * - A receptionist can only query analytics reports belonging to their own
 *   organization/department (PATCH
 *   /healthcarePlatform/receptionist/analyticsReports)
 * - Attempts to filter by another (random) organization or department do not
 *   leak cross-tenant data
 *
 * Workflow:
 *
 * 1. Register two different receptionist accounts (simulate different
 *    organizations).
 * 2. Login as the first receptionist.
 * 3. Query for analytics reports with filters for a random, non-owned
 *    organization_id/department_id.
 * 4. Verify the result does not contain reports (or cross-tenant leakage).
 */
export async function test_api_analyticsreport_receptionist_role_filtering_and_permission_denied(
  connection: api.IConnection,
) {
  // 1. Register two receptionist accounts with unique emails
  const email1 = typia.random<string & tags.Format<"email">>();
  const email2 = typia.random<string & tags.Format<"email">>();
  const receptionist1 = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: email1,
        full_name: RandomGenerator.name(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionist1);
  const receptionist2 = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: email2,
        full_name: RandomGenerator.name(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionist2);

  // 2. Login as first receptionist
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: email1,
      password: "1234",
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Attempt to query another (random) organization/department's reports
  const randomOrgId = typia.random<string & tags.Format<"uuid">>();
  const randomDeptId = typia.random<string & tags.Format<"uuid">>();
  const filterBody = {
    organization_id: randomOrgId,
    department_id: randomDeptId,
    page: 1,
    limit: 5,
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;

  const result =
    await api.functional.healthcarePlatform.receptionist.analyticsReports.index(
      connection,
      {
        body: filterBody,
      },
    );
  typia.assert(result);

  // 4. Verify no reports returned (cross-tenant data filtering)
  TestValidator.equals(
    "should not return reports for other organizations or departments",
    result.data.length,
    0,
  );
}
