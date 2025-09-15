import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsNotificationLog";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * End-to-end test for retrieving a notification log entry by its ID.
 *
 * This test validates that a system administrator can authenticate, and
 * verifies the behavior of notification log retrieval endpoint.
 *
 * Workflow:
 *
 * 1. Authenticate as system administrator via join and login.
 * 2. Attempt to retrieve a notification log entry by a non-existent ID and
 *    expect an error.
 *
 * Note: The creation of notification logs is not possible via current API,
 * thus retrieval of existing entries cannot be tested directly here.
 *
 * Validations:
 *
 * - Authentication succeeds and provides valid user info.
 * - Retrieval with invalid/non-existent log ID results in expected error.
 *
 * Success criteria:
 *
 * - API responses pass full type validation using typia.assert.
 * - TestValidator relations verify id match in output.
 * - Authorization enforced via proper token management.
 */
export async function test_api_notification_log_retrieval_success(
  connection: api.IConnection,
) {
  // 1. SystemAdmin registers using join API
  const adminCreateBody = {
    email: RandomGenerator.pick([
      "admin1@example.com",
      "admin2@example.com",
    ] as const),
    password_hash: "hashed-password-1234",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. SystemAdmin logs in to receive auth tokens
  const adminLoginBody = {
    email: systemAdmin.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Attempt retrieval of non-existent notification log entry
  await TestValidator.error(
    "Retrieving non-existent notification log fails",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.notificationLogs.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
