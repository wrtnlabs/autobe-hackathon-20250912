import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdminNotification";

export async function test_api_oauthserver_admin_admin_notification_update(
  connection: api.IConnection,
) {
  // 1. Admin user sign-up and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "securePassword123",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create admin notification
  const createBody = {
    admin_id: typia.assert(admin.id),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    message: RandomGenerator.content({ paragraphs: 2 }),
    is_read: false,
  } satisfies IOauthServerAdminNotification.ICreate;

  const notification: IOauthServerAdminNotification =
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.create(
      connection,
      { body: createBody },
    );
  typia.assert(notification);

  // 3. Update notification
  // Prepare update body
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 6, wordMax: 12 }),
    message: RandomGenerator.content({ paragraphs: 3 }),
    is_read: true,
  } satisfies IOauthServerAdminNotification.IUpdate;

  const updatedNotification: IOauthServerAdminNotification =
    await api.functional.oauthServer.admin.oauthServerAdminNotifications.update(
      connection,
      {
        id: notification.id,
        body: updateBody,
      },
    );
  typia.assert(updatedNotification);

  // Verify updated fields
  TestValidator.equals(
    "notification ID unchanged after update",
    updatedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "admin_id unchanged after update",
    updatedNotification.admin_id,
    notification.admin_id,
  );
  TestValidator.notEquals(
    "updated title equals old title",
    updatedNotification.title,
    notification.title,
  );
  TestValidator.notEquals(
    "updated message equals old message",
    updatedNotification.message,
    notification.message,
  );
  TestValidator.equals(
    "updated is_read is true",
    updatedNotification.is_read,
    true,
  );
  // Timestamps: updated_at must change, and created_at stays same
  TestValidator.equals(
    "created_at unchanged after update",
    updatedNotification.created_at,
    notification.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed after update",
    updatedNotification.updated_at,
    notification.updated_at,
  );

  // 4. Error test: Update with invalid ID
  await TestValidator.error(
    "update with invalid notification ID should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerAdminNotifications.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 5. Error test: Update without authentication
  // Build unauthenticated connection (empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "update without authentication should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerAdminNotifications.update(
        unauthenticatedConnection,
        {
          id: notification.id,
          body: updateBody,
        },
      );
    },
  );
}
