import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

export async function test_api_analytics_report_creation_department_manager(
  connection: api.IConnection,
) {
  // 1. Department manager join with realistic user data
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
    password: "StrongPass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const authorizedUser: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Department manager login with the same credentials
  const userLoginBody = {
    email: userCreateBody.email,
    password: userCreateBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loggedUser: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: userLoginBody,
    });
  typia.assert(loggedUser);

  TestValidator.equals(
    "tenant_id matches between join and login",
    loggedUser.tenant_id,
    authorizedUser.tenant_id,
  );

  // 3. Prepare valid analytics report creation payload
  const nowIso = new Date().toISOString();
  const reportCreateBody = {
    tenant_id: loggedUser.tenant_id,
    report_name: `compliance report ${RandomGenerator.alphaNumeric(5)}`,
    report_type: "compliance",
    parameters_json: JSON.stringify({ filter: "all", range: "2025-Q3" }),
    generated_at: nowIso,
    content_json: JSON.stringify({
      summary: "Report content for Q3 2025",
      details: [],
    }),
  } satisfies IEnterpriseLmsAnalyticsReport.ICreate;

  // 4. Create analytics report successfully
  const analyticsReport: IEnterpriseLmsAnalyticsReport =
    await api.functional.enterpriseLms.departmentManager.analyticsReports.createAnalyticsReport(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(analyticsReport);

  TestValidator.equals(
    "analytics report tenant_id matches request",
    analyticsReport.tenant_id,
    reportCreateBody.tenant_id,
  );
  TestValidator.equals(
    "analytics report_name matches request",
    analyticsReport.report_name,
    reportCreateBody.report_name,
  );
  TestValidator.equals(
    "analytics report_type matches request",
    analyticsReport.report_type,
    reportCreateBody.report_type,
  );
  TestValidator.equals(
    "analytics parameters_json matches request",
    analyticsReport.parameters_json,
    reportCreateBody.parameters_json,
  );
  TestValidator.equals(
    "analytics generated_at matches request",
    analyticsReport.generated_at,
    reportCreateBody.generated_at,
  );
  TestValidator.equals(
    "analytics content_json matches request",
    analyticsReport.content_json,
    reportCreateBody.content_json,
  );

  TestValidator.predicate(
    "analytics report id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      analyticsReport.id,
    ),
  );

  TestValidator.predicate(
    "analytics created_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
      analyticsReport.created_at,
    ),
  );
  TestValidator.predicate(
    "analytics updated_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
      analyticsReport.updated_at,
    ),
  );

  // 5. Negative case: invalid tenant_id should fail
  const invalidReportCreateBody = {
    ...reportCreateBody,
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IEnterpriseLmsAnalyticsReport.ICreate;

  await TestValidator.error(
    "analytics report creation with invalid tenant_id should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.analyticsReports.createAnalyticsReport(
        connection,
        { body: invalidReportCreateBody },
      );
    },
  );

  // 6. Negative case: unauthorized (no auth token) should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "analytics report creation without authorization should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.analyticsReports.createAnalyticsReport(
        unauthConn,
        { body: reportCreateBody },
      );
    },
  );
}
