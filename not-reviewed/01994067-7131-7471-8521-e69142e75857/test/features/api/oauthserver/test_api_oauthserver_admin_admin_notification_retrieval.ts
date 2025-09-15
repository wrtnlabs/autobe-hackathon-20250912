import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdminNotification";

/**
 * This test validates retrieval of a specific admin notification by its unique
 * ID for authorized admin users through the following business scenario:
 *
 * 1. An admin user is created and authorized via the /auth/admin/join endpoint.
 *    This provides the necessary authentication token for admin operations.
 * 2. Using the authenticated admin credentials, a new admin notification is
 *    created via POST /oauthServer/admin/oauthServerAdminNotifications. The
 *    notification data includes the admin's own ID, a realistic title and
 *    message, and an initial 'is_read' status (false).
 * 3. The test retrieves the created admin notification using GET
 *    /oauthServer/admin/oauthServerAdminNotifications/{id} with the newly
 *    created notification's ID.
 * 4. Validations are performed to ensure the retrieved notification's title,
 *    message, read status, admin ID, and timestamps exactly match or exist as
 *    expected. The timestamps are validated for presence and format
 *    compliance.
 * 5. The test attempts to retrieve a notification with an invalid/non-existent
 *    UUID and validates that an error is thrown (assumed 404 or equivalent).
 * 6. The test attempts to retrieve the notification without authentication (using
 *    an unauthenticated connection) and verifies that access is denied with an
 *    appropriate error (401 or 403).
 *
 * This scenario ensures:
 *
 * - Only authenticated admin users can retrieve admin notifications.
 * - Data integrity and consistency for notifications.
 * - Proper error handling for invalid ID and unauthorized access.
 */
export async function test_api_oauthserver_admin_admin_notification_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin joins (create admin)
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: false,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerAdmin.ICreate;

  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create admin notification
  const notificationCreateBody = {
    admin_id: admin.id,
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    message: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    is_read: false,
  } satisfies IOauthServerAdminNotification.ICreate;

  const notification: IOauthServerAdminNotification =
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.create(
      connection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert(notification);

  // 3. Retrieve the created notification
  const gottenNotification: IOauthServerAdminNotification =
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.at(
      connection,
      { id: notification.id },
    );
  typia.assert(gottenNotification);

  // 4. Validate the retrieved notification matches the created notification
  TestValidator.equals(
    "admin ID matches",
    gottenNotification.admin_id,
    notificationCreateBody.admin_id,
  );
  TestValidator.equals(
    "title matches",
    gottenNotification.title,
    notificationCreateBody.title,
  );
  TestValidator.equals(
    "message matches",
    gottenNotification.message,
    notificationCreateBody.message,
  );
  TestValidator.equals(
    "is_read matches",
    gottenNotification.is_read,
    notificationCreateBody.is_read,
  );

  // Validate timestamps presence and ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601 string",
    typeof gottenNotification.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        gottenNotification.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 string",
    typeof gottenNotification.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        gottenNotification.updated_at,
      ),
  );

  // 5. Attempt to get notification with an invalid ID
  await TestValidator.error("error on retrieving with invalid ID", async () => {
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.at(
      connection,
      {
        id: "00000000-0000-0000-0000-000000000000" satisfies string &
          tags.Format<"uuid">,
      },
    );
  });

  // 6. Attempt to access retrieval without authentication
  // Create unauthenticated connection by copying and clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access rejection", async () => {
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.at(
      unauthConn,
      { id: notification.id },
    );
  });
}
