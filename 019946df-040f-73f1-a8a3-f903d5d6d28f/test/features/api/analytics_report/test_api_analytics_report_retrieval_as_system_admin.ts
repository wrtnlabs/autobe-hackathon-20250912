import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * E2E test scenario for System Admin analytics report detail retrieval.
 *
 * 1. Execute join for system admin user using /auth/systemAdmin/join endpoint.
 * 2. Login using /auth/systemAdmin/login to obtain JWT tokens and
 *    authenticate.
 * 3. Use authenticated context to retrieve a detailed analytics report with a
 *    valid analyticsReportId.
 * 4. Verify the response data matches all required fields and expected format.
 * 5. Test error scenario by requesting with an invalid analyticsReportId and
 *    ensure error is raised.
 * 6. Test unauthorized access by calling the report retrieval with an
 *    unauthenticated connection and expect failure.
 */
export async function test_api_analytics_report_retrieval_as_system_admin(
  connection: api.IConnection,
) {
  // 1. Create a new system admin user
  const systemAdminCreateBody = {
    email: RandomGenerator.alphaNumeric(5) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdminAuthorized);

  // 2. Login as system admin to get token
  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const systemAdminLoggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminLoggedIn);

  // 3. Use authenticated context to retrieve analytics report info
  // Generate random UUID for a valid analyticsReportId, since no real report id is provided
  const validReportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const analyticsReport: IEnterpriseLmsAnalyticsReport =
    await api.functional.enterpriseLms.systemAdmin.analyticsReports.atAnalyticsReport(
      connection,
      {
        analyticsReportId: validReportId,
      },
    );
  typia.assert(analyticsReport);

  // Verify the analytics report id is in UUID format
  TestValidator.predicate(
    "analyticsReport.id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      analyticsReport.id,
    ),
  );

  // 4. Test error scenario - invalid analyticsReportId
  await TestValidator.error(
    "invalid analyticsReportId should throw error",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.analyticsReports.atAnalyticsReport(
        connection,
        { analyticsReportId: "00000000-0000-0000-0000-000000000000" },
      );
    },
  );

  // 5. Test unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized call without token should throw error",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.analyticsReports.atAnalyticsReport(
        unauthConn,
        { analyticsReportId: validReportId },
      );
    },
  );
}
