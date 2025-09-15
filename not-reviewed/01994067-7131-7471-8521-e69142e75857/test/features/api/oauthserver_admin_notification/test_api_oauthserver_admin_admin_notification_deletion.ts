import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdminNotification";

/**
 * This test validates the deletion of an administrator notification via the
 * API, ensuring only authenticated admin users can perform soft deletion,
 * handling of invalid IDs, and unauthorized access checks.
 *
 * Step-by-step test implementation:
 *
 * 1. Create and authenticate an admin user using /auth/admin/join with a valid
 *    email (email format) and verified status as true, with a strong password.
 * 2. Create an admin notification for this admin user using
 *    /oauthServer/admin/oauthServerAdminNotifications POST endpoint with a
 *    valid title and message, setting is_read flag.
 * 3. Delete this notification using its exact UUID via
 *    /oauthServer/admin/oauthServerAdminNotifications/{id} DELETE endpoint.
 * 4. Attempt deletion with an invalid UUID and expect an error.
 * 5. Attempt deletion using a connection without authentication headers and expect
 *    an unauthorized error.
 * 6. Confirm the notification is no longer retrievable by attempting to delete
 *    again and expecting an error.
 *
 * Validation points include verifying the deletion returns no content, invalid
 * id deletions return errors, unauthorized requests are blocked, and soft
 * deletion integrity is maintained.
 *
 * The test environment ensures authentication tokens are handled automatically;
 * therefore, authenticate by calling the join admin API and then perform
 * subsequent calls with the authenticated connection.
 *
 * Ensure to handle all API calls with await, use typia.assert for response
 * validation, and provide descriptive TestValidator assertions for business
 * logic confirmation.
 */
export async function test_api_oauthserver_admin_admin_notification_deletion(
  connection: api.IConnection,
) {
  // Step 1: Admin user creation and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      email_verified: true,
      password: "StrongP@ssw0rd!",
    } satisfies IOauthServerAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create admin notification
  const notification =
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.create(
      connection,
      {
        body: {
          admin_id: admin.id,
          title: "Test Notification",
          message: "This is a test notification for deletion.",
          is_read: false,
        } satisfies IOauthServerAdminNotification.ICreate,
      },
    );
  typia.assert(notification);
  TestValidator.equals(
    "Notification belongs to admin",
    notification.admin_id,
    admin.id,
  );

  // Step 3: Delete notification
  await api.functional.oauthServer.admin.oauthServerAdminNotifications.erase(
    connection,
    {
      id: notification.id,
    },
  );

  // Step 4: Attempt to delete with invalid id, expect error
  await TestValidator.error(
    "Delete with invalid UUID should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerAdminNotifications.erase(
        connection,
        {
          id: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );

  // Step 5: Attempt delete without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Delete without authentication should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerAdminNotifications.erase(
        unauthConn,
        {
          id: notification.id,
        },
      );
    },
  );

  // Step 6: Confirm deletion by attempting to delete again (expect error)
  await TestValidator.error(
    "Delete already deleted notification should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerAdminNotifications.erase(
        connection,
        {
          id: notification.id,
        },
      );
    },
  );
}
