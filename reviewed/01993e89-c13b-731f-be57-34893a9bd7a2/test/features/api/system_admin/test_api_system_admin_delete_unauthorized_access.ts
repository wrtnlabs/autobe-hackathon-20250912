import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * Attempt deletion of a system administrator without authentication or
 * authorized role.
 *
 * This test verifies that an unauthorized client (without proper
 * authentication or role) cannot delete a system administrator account,
 * safeguarding the protected resource from unauthorized access.
 *
 * Workflow:
 *
 * 1. Create a system administrator account using the join API endpoint.
 * 2. Attempt to delete the created system administrator using the same
 *    connection without authentication.
 * 3. Confirm that the deletion fails with an error due to lack of
 *    authorization.
 *
 * This ensures security enforcement on critical administrative API
 * operations.
 */
export async function test_api_system_admin_delete_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Perform systemAdmin join to create a system admin user
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: `sysadmin_${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "password123",
    } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
  });
  typia.assert(admin);

  // 2. Attempt to delete the systemAdmin without authorization (using original connection)
  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.notificationWorkflow.systemAdmin.systemAdmins.erase(
      connection,
      {
        id: typia.assert(admin.id), // Validate the id before use
      },
    );
  });
}
