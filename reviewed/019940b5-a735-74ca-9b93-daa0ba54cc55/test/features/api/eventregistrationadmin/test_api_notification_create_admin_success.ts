import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";

/**
 * Test creating a new notification record via admin API.
 *
 * The scenario involves:
 *
 * 1. Creating an admin user account with required fields
 * 2. Asserting the admin user creation response and token
 * 3. Creating a notification for a user (using the admin's id as user_id)
 * 4. Asserting the notification creation response including all fields
 *
 * This validates authorization, notification creation, and response
 * consistency.
 */
export async function test_api_notification_create_admin_success(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const passwordHash: string = RandomGenerator.alphaNumeric(64); // simulate hash
  const fullName = RandomGenerator.name();

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
        full_name: fullName,
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create notification associated with user
  const notificationType = "registration_confirmation";
  const notificationContent = `${fullName} registered successfully.`;

  const notification: IEventRegistrationNotification =
    await api.functional.eventRegistration.admin.notifications.create(
      connection,
      {
        body: {
          user_id: admin.id,
          type: notificationType,
          content: notificationContent,
          read: false,
        } satisfies IEventRegistrationNotification.ICreate,
      },
    );
  typia.assert(notification);

  // 3. Assertions for notification response
  TestValidator.equals(
    "notification user_id matches admin id",
    notification.user_id,
    admin.id,
  );
  TestValidator.equals(
    "notification type matches input",
    notification.type,
    notificationType,
  );
  TestValidator.equals(
    "notification content matches input",
    notification.content,
    notificationContent,
  );
  TestValidator.predicate(
    "notification read flag is false",
    notification.read === false,
  );
  TestValidator.predicate(
    "notification id is a uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      notification.id,
    ),
  );
  TestValidator.predicate(
    "notification created_at is ISO 8601 date-time",
    ((): boolean => {
      try {
        const d = new Date(notification.created_at);
        return !isNaN(d.getTime()) && notification.created_at.endsWith("Z");
      } catch {
        return false;
      }
    })(),
  );
  TestValidator.predicate(
    "notification updated_at is ISO 8601 date-time",
    ((): boolean => {
      try {
        const d = new Date(notification.updated_at);
        return !isNaN(d.getTime()) && notification.updated_at.endsWith("Z");
      } catch {
        return false;
      }
    })(),
  );
  // deleted_at can be null or undefined, explicitly must be null if present
  if (notification.deleted_at !== undefined) {
    TestValidator.equals(
      "notification deleted_at is null",
      notification.deleted_at,
      null,
    );
  }
}
