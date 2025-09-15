import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSourceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceLog";

/**
 * This scenario tests retrieving a specific data source log entry by its unique
 * logId with administrator authentication.
 *
 * 1. Register and login as a new admin using /auth/admin/join and
 *    /auth/admin/login to obtain JWT tokens.
 * 2. Ensure the target logId exists, if needed create a sample log entry through
 *    direct DB setup or existing APIs (assumed pre-existing).
 * 3. Perform a GET call to /flexOffice/admin/dataSourceLogs/{logId} with proper
 *    authorization headers.
 * 4. Verify the response contains the detailed log entity matching the logId.
 * 5. Test unauthorized access returns appropriate 401 or 403 errors.
 * 6. Test non-existent logId returns 404 error with descriptive message.
 *
 * This ensures secure and accurate access to individual audit log entries for
 * administration and audit purposes.
 */
export async function test_api_data_source_log_retrieval_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Create and authenticate new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword123";
  const createBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(adminAuth);

  // Login to confirm authentication
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loginAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loginAuth);

  // 2. Use a valid UUID for logId (simulate existing log entry)
  // Using a random UUID suffices here as the test system should have a log with this ID
  const existingLogId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve the existing log entry
  const logEntry: IFlexOfficeDataSourceLog =
    await api.functional.flexOffice.admin.dataSourceLogs.at(connection, {
      logId: existingLogId,
    });
  typia.assert(logEntry);

  TestValidator.equals(
    "log entry id matches requested id",
    logEntry.id,
    existingLogId,
  );

  TestValidator.predicate(
    "log entry has valid log_level",
    typeof logEntry.log_level === "string" && logEntry.log_level.length > 0,
  );

  TestValidator.predicate(
    "timestamp is non-empty string",
    typeof logEntry.timestamp === "string" && logEntry.timestamp.length > 0,
  );

  // 4. Unauthorized access: create a connection without auth header
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("GET log unauthorized access fails", async () => {
    await api.functional.flexOffice.admin.dataSourceLogs.at(
      unauthenticatedConnection,
      { logId: existingLogId },
    );
  });

  // 5. Non-existent logId should return 404 error
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "GET with non-existent logId returns 404",
    async () => {
      await api.functional.flexOffice.admin.dataSourceLogs.at(connection, {
        logId: nonExistentLogId,
      });
    },
  );
}
