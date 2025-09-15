import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeUserActivityLog";

/**
 * This test validates the admin user flow for detail retrieval of a user
 * activity log entry.
 *
 * Process:
 *
 * 1. Creates an admin user account using the join endpoint with a randomly
 *    generated unique email and a strong password.
 * 2. Logs in as the existing admin user to obtain an authentication token.
 * 3. Uses the token to perform an authorized retrieval of a specific user
 *    activity log by ID.
 * 4. Verifies the returned user activity log details match the
 *    IFlexOfficeUserActivityLog schema and expected property formats.
 * 5. Tests negative scenarios ensuring unauthorized access and non-existent
 *    IDs result in error responses.
 *
 * This comprehensive scenario ensures security validation, proper
 * authentication handling, and data consistency in audit logging
 * mechanisms.
 */
export async function test_api_user_activity_log_detail_retrieval_admin_access(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin user via join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const password = "StrongPassword123!";
  const createdAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: { email: adminEmail, password } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Login as the same admin user
  const loginResponse: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: { email: adminEmail, password } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loginResponse);

  // Step 3: Attempt to retrieve an existing User Activity Log entry
  // We simulate generating a valid user activity log ID for test consistency
  const validLogId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve user activity log detail
  const userActivityLog: IFlexOfficeUserActivityLog =
    await api.functional.flexOffice.admin.userActivityLogs.at(connection, {
      id: validLogId,
    });
  typia.assert(userActivityLog);

  // Validate required fields and format
  TestValidator.predicate(
    "userActivityLog id exists and is UUID",
    typeof userActivityLog.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userActivityLog.id,
      ),
  );
  TestValidator.predicate(
    "userActivityLog user_id exists and is UUID",
    typeof userActivityLog.user_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userActivityLog.user_id,
      ),
  );
  TestValidator.predicate(
    "userActivityLog action_type is non-empty string",
    typeof userActivityLog.action_type === "string" &&
      userActivityLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "userActivityLog created_at format",
    typeof userActivityLog.created_at === "string" &&
      !isNaN(Date.parse(userActivityLog.created_at)),
  );
  TestValidator.predicate(
    "userActivityLog updated_at format",
    typeof userActivityLog.updated_at === "string" &&
      !isNaN(Date.parse(userActivityLog.updated_at)),
  );

  // Step 4: Test unauthorized access with invalid token
  // Create new connection without authorization headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access should be rejected",
    async () => {
      await api.functional.flexOffice.admin.userActivityLogs.at(unauthConn, {
        id: validLogId,
      });
    },
  );

  // Step 5: Test retrieval with non-existent log ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail for non-existent user activity log id",
    async () => {
      await api.functional.flexOffice.admin.userActivityLogs.at(connection, {
        id: nonExistentId,
      });
    },
  );
}
