import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformOutcomeMetric";

/**
 * Validate department head outcome metric query context filtering.
 *
 * 1. Register and login as department head (org A, dept D1)
 * 2. Seed outcome metrics (3 metric names, 2-3 time points, org=orgA, dept=D1)
 * 3. Register another department head (org A, dept D2) and seed different outcome
 *    metric
 * 4. Department head D1 queries outcomeMetrics with filter (metric_name partial,
 *    observed value range, time range)
 *
 *    - Only sees their department's data, not D2's data
 *    - Filtering by metric_name substring works
 *    - Filtering by observed_at time range works
 *    - Filtering by observed_value min/max works
 *    - Pagination and sort param
 * 5. Unauthorized call (no login) returns 401/403
 */
export async function test_api_outcome_metric_query_department_head_context_filter(
  connection: api.IConnection,
) {
  // Step 1: Register department head for orgA/dept1
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const dept1Id = typia.random<string & tags.Format<"uuid">>();
  const dept2Id = typia.random<string & tags.Format<"uuid">>();
  const dh1_email = typia.random<string & tags.Format<"email">>();
  const dh1_password = RandomGenerator.alphaNumeric(10);
  const dh1: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: dh1_email,
        password: dh1_password,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    });
  typia.assert(dh1);

  // Step 2: Seed outcome metrics for dept1 (multiple metrics, overlapping names/times)
  const metricNames = [
    "mortality_rate",
    "infection_rate",
    "satisfaction_score",
  ] as const;
  const dept1Metrics: IHealthcarePlatformOutcomeMetric[] = [];
  const now = new Date();
  for (const name of metricNames) {
    for (let i = 0; i < 2; ++i) {
      const value = 50 + i * 10 + Math.random() * 5;
      const observed_at = new Date(
        now.getTime() - i * 24 * 60 * 60 * 1000,
      ).toISOString();
      const metric =
        await api.functional.healthcarePlatform.departmentHead.outcomeMetrics.create(
          connection,
          {
            body: {
              organization_id: orgId,
              department_id: dept1Id,
              metric_name: name,
              description: RandomGenerator.paragraph({ sentences: 5 }),
              cohort_definition_json: JSON.stringify({
                gender: "all",
                ages: [20, 80],
              }),
              observed_value: value,
              observed_at,
            },
          },
        );
      typia.assert(metric);
      dept1Metrics.push(metric);
    }
  }

  // Step 3: Create dept2 head and metric
  const dh2_email = typia.random<string & tags.Format<"email">>();
  const dh2_password = RandomGenerator.alphaNumeric(10);
  const dh2: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: dh2_email,
        password: dh2_password,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    });
  typia.assert(dh2);
  // Switch to dh2 session
  await api.functional.auth.departmentHead.login(connection, {
    body: { email: dh2_email, password: dh2_password },
  });
  // Seed metric for different department (same org, different dept)
  const dh2_metric =
    await api.functional.healthcarePlatform.departmentHead.outcomeMetrics.create(
      connection,
      {
        body: {
          organization_id: orgId,
          department_id: dept2Id,
          metric_name: "infection_rate",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          cohort_definition_json: JSON.stringify({
            gender: "all",
            ages: [20, 80],
          }),
          observed_value: 33.3,
          observed_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(dh2_metric);

  // Step 4: Switch back to dh1
  await api.functional.auth.departmentHead.login(connection, {
    body: { email: dh1_email, password: dh1_password },
  });

  // (a) Raw query (no filter): should see only dept1's data
  const page1 =
    await api.functional.healthcarePlatform.departmentHead.outcomeMetrics.index(
      connection,
      {
        body: { organization_id: orgId, department_id: dept1Id },
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "dept1 cannot see metrics from other departments",
    page1.data.every((m) => m.department_id === dept1Id),
  );
  // (b) metric_name partial match (test e.g. "infection")
  const page_infection =
    await api.functional.healthcarePlatform.departmentHead.outcomeMetrics.index(
      connection,
      {
        body: {
          organization_id: orgId,
          department_id: dept1Id,
          metric_name: "infection",
        },
      },
    );
  typia.assert(page_infection);
  TestValidator.predicate(
    "metric_name substring filter matches only correct metric(s)",
    page_infection.data.every((m) => m.metric_name.includes("infection")),
  );
  // (c) time range filter
  const minTime = dept1Metrics[0].observed_at;
  const maxTime = dept1Metrics[dept1Metrics.length - 1].observed_at;
  const page_timerange =
    await api.functional.healthcarePlatform.departmentHead.outcomeMetrics.index(
      connection,
      {
        body: {
          organization_id: orgId,
          department_id: dept1Id,
          observed_at_start: minTime,
          observed_at_end: maxTime,
        },
      },
    );
  typia.assert(page_timerange);
  TestValidator.predicate(
    "time range filter returns only metrics in range",
    page_timerange.data.every(
      (m) => m.observed_at >= minTime && m.observed_at <= maxTime,
    ),
  );
  // (d) observed_value min/max
  const minValue = 50;
  const maxValue = 70;
  const page_valuerange =
    await api.functional.healthcarePlatform.departmentHead.outcomeMetrics.index(
      connection,
      {
        body: {
          organization_id: orgId,
          department_id: dept1Id,
          value_min: minValue,
          value_max: maxValue,
        },
      },
    );
  typia.assert(page_valuerange);
  TestValidator.predicate(
    "value range filter returns only metrics within min/max",
    page_valuerange.data.every(
      (m) => m.observed_value >= minValue && m.observed_value <= maxValue,
    ),
  );
  // (e) pagination and sorting (metric_name asc)
  const pageSize = 2;
  const page_pagination =
    await api.functional.healthcarePlatform.departmentHead.outcomeMetrics.index(
      connection,
      {
        body: {
          organization_id: orgId,
          department_id: dept1Id,
          limit: pageSize,
          page: 1,
          sort: "metric_name:asc",
        },
      },
    );
  typia.assert(page_pagination);
  TestValidator.equals(
    "pagination limit works",
    page_pagination.data.length,
    pageSize,
  );

  // Step 5: Unauthorized query (simulate fresh connection: no login)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated outcome metric query fails",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.outcomeMetrics.index(
        unauthConn,
        {
          body: { organization_id: orgId, department_id: dept1Id },
        },
      );
    },
  );
}
