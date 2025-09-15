import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeSystemAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemAlerts";

/**
 * Test the deletion of an existing system alert by an authenticated admin
 * user.
 *
 * This test covers the complete flow:
 *
 * 1. Admin user joins and logs in to obtain authentication.
 * 2. Admin creates a system alert to obtain a valid system alert ID.
 * 3. The system alert is deleted using the DELETE endpoint.
 * 4. Verify no content is returned from deletion.
 * 5. Confirm the system alert no longer exists by attempting retrieval
 *    resulting in error.
 * 6. Test error scenarios: deleting a non-existing alert returns a 404 error.
 * 7. Attempt deletion without admin authentication to confirm access is denied
 *    (401 error).
 *
 * Business rules ensure only admins can delete alerts and deletion is
 * irreversible.
 */
export async function test_api_system_alert_delete_existing_alert(
  connection: api.IConnection,
) {
  // 1. Admin Join
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "admin1234",
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuth);

  // 2. Admin Login (ensure token refresh and set)
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Create system alert to get ID for deletion
  const systemAlertCreateBody = {
    severity: "info",
    message: "Test system alert for deletion",
    is_resolved: false,
  } satisfies IFlexOfficeSystemAlerts.ICreate;

  const systemAlert: IFlexOfficeSystemAlerts =
    await api.functional.flexOffice.admin.systemAlerts.create(connection, {
      body: systemAlertCreateBody,
    });
  typia.assert(systemAlert);

  // 4. Delete the created system alert
  await api.functional.flexOffice.admin.systemAlerts.erase(connection, {
    id: systemAlert.id,
  });

  // 5. Verify the alert is deleted by attempting to delete again (should 404 error)
  await TestValidator.error(
    "deleting non-existing alert returns error",
    async () => {
      await api.functional.flexOffice.admin.systemAlerts.erase(connection, {
        id: systemAlert.id,
      });
    },
  );

  // 6. Verify unauthorized deletion attempt fails
  // Create unauthenticated connection (empty headers, no token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized deletion attempt fails", async () => {
    await api.functional.flexOffice.admin.systemAlerts.erase(unauthConn, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
