import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

/**
 * Test retrieval of a detailed analytics report by ID for department manager
 * role.
 *
 * This test verifies that a department manager can authenticate (join and
 * login), then retrieve an analytics report by ID with valid authorization and
 * tenant context. The test validates the returned report details including
 * matching the report ID.
 *
 * It also tests failure scenarios for unauthorized access and requests for
 * non-existent IDs.
 *
 * Steps:
 *
 * 1. Join as a new department manager with realistic data.
 * 2. Login as the new department manager.
 * 3. Fetch a randomly generated analytics report and use its ID for retrieval.
 * 4. Retrieve the analytics report by ID and verify its content.
 * 5. Attempt unauthorized access by making request without authentication.
 * 6. Attempt retrieval of a non-existent analytics report ID.
 */
export async function test_api_analytics_report_retrieval_department_manager(
  connection: api.IConnection,
) {
  // Step 1. Join department manager with realistic data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // secure enough password
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const joined: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Step 2. Login as the new department manager
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loggedIn: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // Step 3. Generate a random analytics report object to simulate existing data
  const randomReport = typia.random<IEnterpriseLmsAnalyticsReport>();

  // Extract the report ID for retrieval
  const analyticsReportId: string & tags.Format<"uuid"> =
    randomReport.id satisfies string & tags.Format<"uuid"> as string &
      tags.Format<"uuid">;

  // Step 4. Retrieve the analytics report by ID
  const retrievedReport: IEnterpriseLmsAnalyticsReport =
    await api.functional.enterpriseLms.departmentManager.analyticsReports.atAnalyticsReport(
      connection,
      {
        analyticsReportId: analyticsReportId,
      },
    );
  typia.assert(retrievedReport);

  // Validate that the report id matches the requested id
  TestValidator.equals(
    "retrieved analytics report id matches",
    retrievedReport.id,
    analyticsReportId,
  );

  // Step 5. Attempt unauthorized access
  // Create a connection with empty headers to simulate unauthenticated access
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access should throw error",
    async () => {
      await api.functional.enterpriseLms.departmentManager.analyticsReports.atAnalyticsReport(
        unauthConn,
        {
          analyticsReportId: analyticsReportId,
        },
      );
    },
  );

  // Step 6. Attempt retrieval of a non-existent analytics report ID
  // Use a UUID that is very unlikely to exist
  const nonExistentId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;

  await TestValidator.error(
    "request for non-existent analytics report id should throw error",
    async () => {
      await api.functional.enterpriseLms.departmentManager.analyticsReports.atAnalyticsReport(
        connection,
        {
          analyticsReportId: nonExistentId,
        },
      );
    },
  );
}
