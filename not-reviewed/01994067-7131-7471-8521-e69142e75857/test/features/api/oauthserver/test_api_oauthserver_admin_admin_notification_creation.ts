import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdminNotification";

export async function test_api_oauthserver_admin_admin_notification_creation(
  connection: api.IConnection,
) {
  // 1. Admin user registration via auth/admin/join
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        email_verified: true,
        password: "strong-password-1234",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create admin notification success with all required fields
  // Using the authenticated connection with the token automatically set
  const notificationBody = {
    admin_id: admin.id,
    title: "System maintenance notice",
    message: "Scheduled system maintenance at midnight.",
    is_read: false,
  } satisfies IOauthServerAdminNotification.ICreate;

  const notification: IOauthServerAdminNotification =
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.create(
      connection,
      {
        body: notificationBody,
      },
    );
  typia.assert(notification);

  // Validate that response matches input fields and timestamps are present
  TestValidator.equals(
    "notification admin_id matches",
    notification.admin_id,
    notificationBody.admin_id,
  );
  TestValidator.equals(
    "notification title matches",
    notification.title,
    notificationBody.title,
  );
  TestValidator.equals(
    "notification message matches",
    notification.message,
    notificationBody.message,
  );
  TestValidator.equals(
    "notification is_read matches",
    notification.is_read,
    notificationBody.is_read,
  );

  // created_at and updated_at must be defined strings with date-time format
  // typia.assert ensures format, so we just check existence
  TestValidator.predicate(
    "notification created_at exists",
    typeof notification.created_at === "string",
  );
  TestValidator.predicate(
    "notification updated_at exists",
    typeof notification.updated_at === "string",
  );

  // 3. Attempt to create notification without authentication - should be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated creation should be forbidden",
    async () => {
      await api.functional.oauthServer.admin.oauthServerAdminNotifications.create(
        unauthConn,
        {
          body: notificationBody,
        },
      );
    },
  );
}
