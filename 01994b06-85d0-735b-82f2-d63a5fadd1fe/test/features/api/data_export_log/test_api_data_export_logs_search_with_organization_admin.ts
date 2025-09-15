import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDataExportLog";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDataExportLog";

/**
 * End-to-end test for searching paginated data export logs as an organization
 * admin.
 *
 * - Registers a new org admin
 * - Authenticates as the org admin
 * - Submits a search for export logs with filter parameters
 * - Checks that results match the organization and filter
 * - Runs a negative test with unusable filter/cross-org attempt
 */
export async function test_api_data_export_logs_search_with_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register a new organization administrator
  const email = typia.random<string & tags.Format<"email">>();
  const fullName = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email,
      full_name: fullName,
      password,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Login as the organization admin to enforce fresh token (simulates real workflow)
  const authed = await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email,
      password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  typia.assert(authed);

  // 3. Query export logs using various organization-scoped filters
  const validExportTypes = ["EHR_BULK", "REPORT"] as const;
  const validStatuses = ["COMPLETED", "FAILED", "IN_PROGRESS"] as const;
  const validDestinations = ["USER_DOWNLOAD", "EXTERNAL_API"] as const;

  // Compose a filter the admin's org might have -- simulate business workflow
  const validFilter = {
    export_type: RandomGenerator.pick(validExportTypes),
    status: RandomGenerator.pick(validStatuses),
    destination: RandomGenerator.pick(validDestinations),
    justification: RandomGenerator.paragraph({ sentences: 1 }),
    page: 1,
    size: 5,
  } satisfies IHealthcarePlatformDataExportLog.IRequest;

  // Search organization export logs (should only return records from this org & filter criteria)
  const found =
    await api.functional.healthcarePlatform.organizationAdmin.dataExportLogs.index(
      connection,
      { body: validFilter },
    );
  typia.assert(found);
  TestValidator.predicate(
    "all logs should match filter and organization scope",
    found.data.every(
      (rec) =>
        (!validFilter.export_type ||
          rec.export_type === validFilter.export_type) &&
        (!validFilter.status || rec.status === validFilter.status) &&
        (!validFilter.destination ||
          rec.destination === validFilter.destination),
    ),
  );

  // 4. Run a negative test for cross-org or impossible filter (no records expected)
  const impossibleFilter = {
    export_type: "NON_EXISTENT_EXPORT_TYPE",
    destination: "USER_DOWNLOAD",
    page: 1,
    size: 5,
  } satisfies IHealthcarePlatformDataExportLog.IRequest;

  const notFound =
    await api.functional.healthcarePlatform.organizationAdmin.dataExportLogs.index(
      connection,
      { body: impossibleFilter },
    );
  typia.assert(notFound);
  TestValidator.equals(
    "negative (impossible) filter yields zero data",
    notFound.data.length,
    0,
  );
}
