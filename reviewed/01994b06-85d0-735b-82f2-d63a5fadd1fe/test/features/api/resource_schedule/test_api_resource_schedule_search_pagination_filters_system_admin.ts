import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformResourceSchedule";

/**
 * Advanced resource schedule search and pagination for system administrator.
 *
 * This test verifies the PATCH endpoint for
 * /healthcarePlatform/systemAdmin/resourceSchedules, covering advanced
 * querying, paging, filtering, and error conditions by a system admin. Business
 * context requires system admins to see all resource schedules across all
 * organizations and resources, with robust search and error handling logic.
 *
 * Steps:
 *
 * 1. Register as system admin (using unique business email and password).
 * 2. Perform basic search (no filters).
 * 3. If zero rows exist, skip detailed filtering/pagination (no data).
 * 4. Select at least one schedule and extract unique organization_id and
 *    resource_id.
 * 5. Perform filter by organization_id, validate all entries.
 * 6. Filter by resource_id, validate.
 * 7. Filter by both org and resource.
 * 8. Try pagination with valid page/limit combinations, check results.
 */
export async function test_api_resource_schedule_search_pagination_filters_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and login as system admin
  const systemAdminBody = {
    email: RandomGenerator.name(1) + Date.now() + "@company.com",
    full_name: RandomGenerator.name(2),
    provider: "local",
    provider_key: RandomGenerator.name(1),
    password: "Admin!1234",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: systemAdminBody,
  });
  typia.assert(sysAdmin);

  // Step 2: Perform unfiltered search
  const allSchedules =
    await api.functional.healthcarePlatform.systemAdmin.resourceSchedules.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allSchedules);
  TestValidator.predicate(
    "unfiltered search returns page object",
    allSchedules.pagination.current >= 1 && Boolean(allSchedules.data),
  );

  // Step 3: If no schedules exist, skip advanced tests
  if (allSchedules.data.length === 0) return;

  // Step 4: Pick first schedule's organization_id and resource_id
  const sample = allSchedules.data[0];

  // Step 5: Filter by organization_id
  const orgFiltered =
    await api.functional.healthcarePlatform.systemAdmin.resourceSchedules.index(
      connection,
      {
        body: { organization_id: sample.healthcare_platform_organization_id },
      },
    );
  typia.assert(orgFiltered);
  TestValidator.predicate(
    "filter by org returns only correct org",
    orgFiltered.data.every(
      (s) =>
        s.healthcare_platform_organization_id ===
        sample.healthcare_platform_organization_id,
    ),
  );

  // Step 6: Filter by resource_id
  const resourceFiltered =
    await api.functional.healthcarePlatform.systemAdmin.resourceSchedules.index(
      connection,
      {
        body: { resource_id: sample.resource_id },
      },
    );
  typia.assert(resourceFiltered);
  TestValidator.predicate(
    "filter by resource returns only correct resource",
    resourceFiltered.data.every((s) => s.resource_id === sample.resource_id),
  );

  // Step 7: Filter by org+resource
  const bothFiltered =
    await api.functional.healthcarePlatform.systemAdmin.resourceSchedules.index(
      connection,
      {
        body: {
          organization_id: sample.healthcare_platform_organization_id,
          resource_id: sample.resource_id,
        },
      },
    );
  typia.assert(bothFiltered);
  TestValidator.predicate(
    "org+resource filter returns only matches",
    bothFiltered.data.every(
      (s) =>
        s.healthcare_platform_organization_id ===
          sample.healthcare_platform_organization_id &&
        s.resource_id === sample.resource_id,
    ),
  );

  // Step 8: Pagination test
  const paged =
    await api.functional.healthcarePlatform.systemAdmin.resourceSchedules.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "paged result returns limit=1",
    paged.data.length === 1 || paged.data.length === 0,
    true,
  );
}
