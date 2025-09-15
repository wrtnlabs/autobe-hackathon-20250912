import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";

/**
 * Test retrieving a single notification by its unique ID using event
 * organizer authentication.
 *
 * Business context: Event organizers must be able to securely access their
 * own notifications. This test sets up the full flow of creating an event
 * organizer user, authenticating them, creating a notification associated
 * with their user ID by an admin, and then retrieving this notification as
 * the event organizer.
 *
 * This ensures that notification retrieval is properly scoped, secure, and
 * returns correct content.
 *
 * Steps:
 *
 * 1. Create an event organizer user (simulate join operation)
 * 2. Authenticate the created event organizer user (login)
 * 3. Create an admin user and login for authorization to create notifications
 * 4. Create a notification tied to the event organizer's user ID by the admin
 * 5. As the authenticated event organizer, retrieve the notification by ID
 * 6. Validate the retrieved notification matches the created one and belongs
 *    to the user
 */
export async function test_api_event_organizer_notification_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Event Organizer user signs up
  const organizerPassword = RandomGenerator.alphaNumeric(10);
  const organizerJoinBody = {
    email: RandomGenerator.name(1).toLowerCase() + "@example.com",
    password_hash: organizerPassword,
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const organizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: organizerJoinBody,
    });
  typia.assert(organizer);

  // 2. Event Organizer user logs in
  const organizerLoginBody = {
    email: organizer.email,
    password_hash: organizerPassword,
  } satisfies IEventRegistrationEventOrganizer.ILogin;
  const organizerLoggedIn: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.login(connection, {
      body: organizerLoginBody,
    });
  typia.assert(organizerLoggedIn);

  // 3. Admin user signs up
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoinBody = {
    email: RandomGenerator.name(1).toLowerCase() + "@admin.com",
    password_hash: adminPassword,
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminUser);

  // 4. Admin user logs in
  const adminLoginBody = {
    email: adminUser.email,
    password_hash: adminPassword,
  } satisfies IEventRegistrationAdmin.ILogin;
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: adminLoginBody,
  });

  // 5. Create a notification associated with the event organizer's userId
  const notificationBody = {
    user_id: organizer.id, // Must exactly match event organizer's UUID
    type: "registration confirmation",
    content: "Your event registration has been confirmed.",
    read: false,
  } satisfies IEventRegistrationNotification.ICreate;

  const notification: IEventRegistrationNotification =
    await api.functional.eventRegistration.admin.notifications.create(
      connection,
      {
        body: notificationBody,
      },
    );
  typia.assert(notification);

  // 6. Switch context to event organizer user for notification retrieval again
  // Just re-login to simulate
  await api.functional.auth.eventOrganizer.login(connection, {
    body: organizerLoginBody,
  });

  // 7. Retrieve the notification by notification ID as event organizer
  const notificationRead: IEventRegistrationNotification =
    await api.functional.eventRegistration.eventOrganizer.notifications.at(
      connection,
      {
        notificationId: notification.id,
      },
    );
  typia.assert(notificationRead);

  // 8. Validate that the retrieved notification matches the created one
  TestValidator.equals(
    "notification IDs should be the same",
    notificationRead.id,
    notification.id,
  );
  TestValidator.equals(
    "notification user IDs should match",
    notificationRead.user_id,
    organizer.id,
  );
  TestValidator.equals(
    "notification type should match",
    notificationRead.type,
    notificationBody.type,
  );
  TestValidator.equals(
    "notification content should match",
    notificationRead.content,
    notificationBody.content,
  );
  TestValidator.predicate(
    "notification read flag should be false",
    notificationRead.read === false,
  );
}
