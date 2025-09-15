import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformOutcomeMetric";

/**
 * Validate advanced query, filter, and pagination for outcome metrics as an
 * organization admin.
 *
 * 1. Register and login an organization admin (using a generated organization_id
 *    for consistent context).
 * 2. Seed several outcome metrics of mixed metric_name, cohort, and observed_at
 *    for this org (with a single department_id).
 * 3. Query outcome metrics with:
 *
 *    - No filters: Should return all seeded (pagination applies)
 *    - Org/dept filter: Should limit to admin's org/dept
 *    - Metric_name filter: Should return only the matching metric(s)
 *    - Observed_at_start & observed_at_end: Should limit to matching range
 *    - Sorting and pagination: Results should be correctly paginated as requested
 * 4. Attempt query as unauthenticated/invalid context should produce error.
 */
export async function test_api_outcome_metric_query_organization_admin_filter_pagination(
  connection: api.IConnection,
) {
  // 1. Prepare consistent organization & department context
  const organization_id = typia.random<string & tags.Format<"uuid">>();
  const department_id = typia.random<string & tags.Format<"uuid">>();

  // Register and login organization admin (simulating onboarding for organization_id)
  const joinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "test_password",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  await api.functional.auth.organizationAdmin.join(connection, {
    body: joinReq,
  });
  // Admin token is applied to connection automatically

  // 2. Seed outcome metrics with different metric_name, cohort, timestamps
  const metricNames = ["heart_rate", "glucose", "bp_systolic"] as const;
  const cohortDefs = [
    { cohort: "adult", desc: "Adult cohort" },
    { cohort: "senior", desc: "Senior cohort" },
  ];
  const seedMetrics: IHealthcarePlatformOutcomeMetric[] = [];
  for (let i = 0; i < 8; ++i) {
    const metric_name = RandomGenerator.pick(metricNames);
    const cohort = RandomGenerator.pick(cohortDefs);
    const observed_at = new Date(Date.now() - i * 86400000).toISOString();
    const metricReq = {
      organization_id,
      department_id,
      metric_name,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      cohort_definition_json: JSON.stringify({
        cohort: cohort.cohort,
        desc: cohort.desc,
      }),
      observed_value: 10 + i,
      observed_at,
    } satisfies IHealthcarePlatformOutcomeMetric.ICreate;
    const created =
      await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.create(
        connection,
        { body: metricReq },
      );
    typia.assert(created);
    seedMetrics.push(created);
  }

  // 3. Query all metrics paginated (limit 5 per page)
  const reqAll = {
    organization_id,
    department_id,
    limit: 5,
    page: 1,
  } satisfies IHealthcarePlatformOutcomeMetric.IRequest;
  let result =
    await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.index(
      connection,
      { body: reqAll },
    );
  typia.assert(result);
  TestValidator.equals("paginated metrics, limit 5", result.data.length, 5);

  // 4. Query with metric_name filter
  const filterName = seedMetrics[0].metric_name;
  const reqMetricName = {
    organization_id,
    department_id,
    metric_name: filterName,
  } satisfies IHealthcarePlatformOutcomeMetric.IRequest;
  result =
    await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.index(
      connection,
      { body: reqMetricName },
    );
  typia.assert(result);
  TestValidator.predicate(
    "all metrics have matching metric_name",
    result.data.every((x) => x.metric_name === filterName),
  );

  // 5. Query with observed_at date range
  const minIdx = 2,
    maxIdx = 6;
  const timeRange = seedMetrics.slice(minIdx, maxIdx + 1);
  const observed_at_start = timeRange[0].observed_at;
  const observed_at_end = timeRange[timeRange.length - 1].observed_at;
  const reqRange = {
    organization_id,
    department_id,
    observed_at_start,
    observed_at_end,
  } satisfies IHealthcarePlatformOutcomeMetric.IRequest;
  result =
    await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.index(
      connection,
      { body: reqRange },
    );
  typia.assert(result);
  TestValidator.predicate(
    "all metrics observed_at within range",
    result.data.every(
      (x) =>
        x.observed_at >= observed_at_start && x.observed_at <= observed_at_end,
    ),
  );

  // 6. Pagination beyond first page
  const reqPage2 = {
    organization_id,
    department_id,
    limit: 5,
    page: 2,
  } satisfies IHealthcarePlatformOutcomeMetric.IRequest;
  result =
    await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.index(
      connection,
      { body: reqPage2 },
    );
  typia.assert(result);
  TestValidator.equals("second page metrics count", result.data.length, 3);

  // 7. Unauthorized: try to query metrics with empty headers (no auth)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized outcomeMetrics.index fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.index(
        unauthConn,
        { body: reqAll },
      );
    },
  );
}
