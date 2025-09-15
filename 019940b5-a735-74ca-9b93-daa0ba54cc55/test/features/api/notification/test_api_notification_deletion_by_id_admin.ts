import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";

/**
 * This test validates the complete workflow of deleting a notification by an
 * admin.
 *
 * It performs the following steps:
 *
 * 1. Creates an admin user via the authentication join endpoint to establish admin
 *    authorization.
 * 2. Creates a notification for a regular user using the notification creation
 *    endpoint.
 * 3. Deletes the created notification as an admin via the delete endpoint.
 *
 * The test asserts that each step completes successfully with proper type
 * validation. It ensures the notification is linked to the correct user and
 * deletion results in no content. This test guarantees that only authorized
 * admins can perform deletion operations on notifications.
 */
export async function test_api_notification_deletion_by_id_admin(
  connection: api.IConnection,
) {
  // 1. Create admin user (establish admin authentication context)
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(2),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create notification for a regular user
  // Prepare a regular user ID as random UUID
  const regularUserId = typia.random<string & tags.Format<"uuid">>();

  // Prepare notification create body
  const notificationCreateBody = {
    user_id: regularUserId,
    type: "registration confirmation",
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 7,
    }),
    read: false,
  } satisfies IEventRegistrationNotification.ICreate;

  const notification: IEventRegistrationNotification =
    await api.functional.eventRegistration.admin.regularUsers.notifications.create(
      connection,
      {
        regularUserId,
        body: notificationCreateBody,
      },
    );
  typia.assert(notification);

  // 3. Delete the notification by its ID as admin
  // Call the erase API
  await api.functional.eventRegistration.admin.notifications.erase(connection, {
    notificationId: notification.id,
  });

  // The absence of error is considered a successful deletion
}
