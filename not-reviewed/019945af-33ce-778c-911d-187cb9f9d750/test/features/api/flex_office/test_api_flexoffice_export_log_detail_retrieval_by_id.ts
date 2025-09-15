import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExportLog";

/**
 * Validates detailed retrieval of a FlexOffice admin export log entry by
 * its unique ID.
 *
 * This test emulates the full authentication and authorization flow for an
 * admin user. It ensures that export logs can only be accessed by
 * authorized admins and that the API response includes correct and complete
 * export log details.
 *
 * Workflow:
 *
 * 1. Admin User Signup: Creates a new admin user with a unique email and
 *    password.
 * 2. Admin User Login: Authenticates the newly created admin user to obtain a
 *    valid JWT token.
 * 3. Export Log Retrieval: a. Uses a simulated export log object to get a
 *    valid exportLogId. b. Retrieves export log by UUID using the
 *    authenticated admin connection. c. Asserts the export log's
 *    executed_by_user_id matches the authenticated admin user ID.
 * 4. Unauthorized Access: a. Attempt to retrieve the export log using a
 *    connection without authentication. b. Confirm the call fails as
 *    expected.
 * 5. Invalid Export Log ID: a. Attempt to retrieve an export log with a
 *    non-existent UUID. b. Confirm the API returns an error status (e.g.,
 *    404).
 *
 * This test ensures audit and security requirements are met in the export
 * log access functionality. It uses representative realistic data
 * conforming to DTO definitions and format constraints.
 */
export async function test_api_flexoffice_export_log_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin User Signup
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Password123!";

  const newAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(newAdmin);

  // Prepare a new connection instance to isolate auth context
  const adminConnection: api.IConnection = Object.assign({}, connection);

  // 2. Admin User Login
  const loginResponse: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(adminConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loginResponse);

  // 3. Generate a simulated export log to have a valid exportLogId for test
  const simulatedExportLog: IFlexOfficeExportLog =
    typia.random<IFlexOfficeExportLog>();
  typia.assert(simulatedExportLog);

  // 4. Export Log Retrieval with authenticated admin connection
  const exportLog: IFlexOfficeExportLog =
    await api.functional.flexOffice.admin.exportLogs.at(adminConnection, {
      exportLogId: simulatedExportLog.id,
    });
  typia.assert(exportLog);

  TestValidator.equals(
    "executed_by_user_id matches authenticated admin ID",
    exportLog.executed_by_user_id,
    newAdmin.id,
  );

  // 5. Unauthorized Access: try with connection with empty headers (no auth)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized request should fail", async () => {
    await api.functional.flexOffice.admin.exportLogs.at(unauthConnection, {
      exportLogId: exportLog.id,
    });
  });

  // 6. Invalid Export Log ID: try to fetch a non-existent UUID
  const invalidUuid: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "fetching non-existent exportLogId should fail",
    async () => {
      await api.functional.flexOffice.admin.exportLogs.at(adminConnection, {
        exportLogId: invalidUuid,
      });
    },
  );
}
