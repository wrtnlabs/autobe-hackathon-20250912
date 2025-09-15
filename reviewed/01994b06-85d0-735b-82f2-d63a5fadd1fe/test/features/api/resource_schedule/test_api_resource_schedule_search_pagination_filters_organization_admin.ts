import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformResourceSchedule";

/**
 * E2E: As organization admin, search paginated and filtered resource schedules,
 * strictly limited to own organization.
 *
 * Steps:
 *
 * 1. Register and authenticate as organization admin. Each admin gets a new org.
 * 2. Perform unfiltered schedule search; verify all schedules (if any) belong to
 *    this org.
 * 3. (If any schedules exist) Extract organization_id from result; test
 *    resourceSchedules.index with organization_id filter (should match all).
 * 4. Try a forbidden organization_id (random unrelated UUID): should yield empty
 *    result.
 * 5. Test multi-filter (resource_type, available_start_time_from) if sample data
 *    allows.
 * 6. Test pagination, verify valid subset and structure.
 * 7. Search with impossible resource_id (random UUID): must return empty result.
 *
 * Note: Skips audit log check - audit endpoint is not exposed, so validation is
 * out of scope. Defensive guards ensure robust operation with or without seed
 * schedule data.
 */
export async function test_api_resource_schedule_search_pagination_filters_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as org admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphabets(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuth);

  // 2. Plain organization admin resource schedule search (no filters): expect all returned records for admin's org only
  const resultUnfiltered =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.index(
      connection,
      { body: {} satisfies IHealthcarePlatformResourceSchedule.IRequest },
    );
  typia.assert(resultUnfiltered);
  // If data exists, all org IDs should be identical
  let orgId: (string & tags.Format<"uuid">) | undefined = undefined;
  if (resultUnfiltered.data.length > 0)
    orgId = resultUnfiltered.data[0].healthcare_platform_organization_id;
  TestValidator.equals(
    "every returned schedule belongs to a single org (or no data)",
    resultUnfiltered.data.every(
      (s) => s.healthcare_platform_organization_id === orgId,
    ) || resultUnfiltered.data.length === 0,
    true,
  );

  // 3. Filter by organization_id (if orgId known)
  if (orgId !== undefined) {
    const resultByOrg =
      await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.index(
        connection,
        {
          body: {
            organization_id: orgId,
          } satisfies IHealthcarePlatformResourceSchedule.IRequest,
        },
      );
    typia.assert(resultByOrg);
    TestValidator.equals(
      "all orgId-filtered schedules belong to that org",
      resultByOrg.data.every(
        (s) => s.healthcare_platform_organization_id === orgId,
      ),
      true,
    );

    // 4. Search on a forbidden (other) org_id
    let forbiddenOrgId: string & tags.Format<"uuid"> = orgId;
    while (forbiddenOrgId === orgId)
      forbiddenOrgId = typia.random<string & tags.Format<"uuid">>();
    const forbiddenResult =
      await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.index(
        connection,
        {
          body: {
            organization_id: forbiddenOrgId,
          } satisfies IHealthcarePlatformResourceSchedule.IRequest,
        },
      );
    typia.assert(forbiddenResult);
    TestValidator.equals(
      "no data returned for forbidden orgId",
      forbiddenResult.data.length,
      0,
    );

    // 5. Multi-filter: filter by resource_type (if available) and available_start_time_from
    const typeSamples = Array.from(
      new Set(resultByOrg.data.map((s) => s.resource_type)),
    ).filter((t) => typeof t === "string" && t.length > 0);
    if (typeSamples.length > 0) {
      const filterType = RandomGenerator.pick(typeSamples as readonly string[]);
      const multiRes =
        await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.index(
          connection,
          {
            body: {
              organization_id: orgId,
              resource_type: filterType,
              available_start_time_from: "00:00" as string &
                tags.Format<"time">,
            } satisfies IHealthcarePlatformResourceSchedule.IRequest,
          },
        );
      typia.assert(multiRes);
      TestValidator.equals(
        "all multi-filtered schedules match resource_type",
        multiRes.data.every((s) => s.resource_type === filterType),
        true,
      );
    }

    // 6. Pagination test: limit 2, page 2
    const limit = 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<1000>;
    const page = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
    const pagedResult =
      await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.index(
        connection,
        {
          body: {
            organization_id: orgId,
            limit,
            page,
          } satisfies IHealthcarePlatformResourceSchedule.IRequest,
        },
      );
    typia.assert(pagedResult);
    TestValidator.equals(
      "pagination structure: current matches",
      pagedResult.pagination.current,
      page,
    );
    TestValidator.equals(
      "pagination structure: limit matches",
      pagedResult.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "paged data does not exceed limit",
      pagedResult.data.length <= limit,
      true,
    );
  }

  // 7. Impossible resource_id (by random UUID): always returns 0 results (with or without orgId)
  const impossibleRes =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.index(
      connection,
      {
        body: {
          ...(orgId !== undefined && { organization_id: orgId }),
          resource_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHealthcarePlatformResourceSchedule.IRequest,
      },
    );
  typia.assert(impossibleRes);
  TestValidator.equals(
    "no results for impossible resource_id",
    impossibleRes.data.length,
    0,
  );
}
