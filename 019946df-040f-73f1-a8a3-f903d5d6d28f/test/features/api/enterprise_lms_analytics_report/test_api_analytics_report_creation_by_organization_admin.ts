import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Test scenario to confirm organizationAdmin can successfully register and
 * authenticate, then create a new analytics report within their tenant
 * context.
 *
 * 1. Registers a new organizationAdmin user with tenant_id, email, and
 *    password.
 * 2. Validates the authentication response including authorization token
 *    presence.
 * 3. Uses the authentication context to request analytics report creation with
 *    valid data.
 * 4. Ensures the created analytics report response has matching tenant_id and
 *    expected structure.
 *
 * The test will generate realistic random data for all string fields
 * including JSON payloads, UUIDs, and datetime strings to satisfy server
 * constraints and validation.
 *
 * This E2E flow validates both business logic and data isolation per
 * tenant.
 */
export async function test_api_analytics_report_creation_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as organizationAdmin
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1).toLowerCase()}${typia.random<number & tags.Type<"uint32">>()}@example.com`;
  const password = "Abcd1234!";

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email,
        password,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdmin);

  // 2. Prepare analytics report creation data
  const reportName = RandomGenerator.name(3);
  const reportType = RandomGenerator.pick([
    "completion",
    "engagement",
    "compliance",
  ] as const);
  const parametersJson = JSON.stringify({
    filters: { status: "active" },
    aggregations: ["count", "average"],
  });
  const generatedAt = new Date().toISOString();
  const contentJson = JSON.stringify({
    meta: { generatedBy: orgAdmin.id },
    data: [],
  });

  const createBody = {
    tenant_id: tenantId,
    report_name: reportName,
    report_type: reportType,
    parameters_json: parametersJson,
    generated_at: generatedAt,
    content_json: contentJson,
  } satisfies IEnterpriseLmsAnalyticsReport.ICreate;

  // 3. Call the analytics report creation API
  const report: IEnterpriseLmsAnalyticsReport =
    await api.functional.enterpriseLms.organizationAdmin.analyticsReports.createAnalyticsReport(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(report);

  // 4. Validate the response contains expected data
  TestValidator.equals("tenant_id matches", report.tenant_id, tenantId);
  TestValidator.equals("report_name matches", report.report_name, reportName);
  TestValidator.equals("report_type matches", report.report_type, reportType);
  TestValidator.equals(
    "parameters_json matches",
    report.parameters_json,
    parametersJson,
  );
  TestValidator.equals(
    "content_json matches",
    report.content_json,
    contentJson,
  );

  // Validate timestamps are ISO date-time strings and non-empty
  TestValidator.predicate(
    "generated_at is iso string",
    typeof report.generated_at === "string" && report.generated_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is iso string",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is iso string",
    typeof report.updated_at === "string" && report.updated_at.length > 0,
  );

  // Validate id is uuid format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate("id is uuid", uuidRegex.test(report.id));
}
