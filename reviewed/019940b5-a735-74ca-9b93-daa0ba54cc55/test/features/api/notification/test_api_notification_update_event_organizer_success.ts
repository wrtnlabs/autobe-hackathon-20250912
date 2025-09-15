import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";

/**
 * This E2E test function validates the full process of updating a notification
 * by an authenticated event organizer user. It carries out all prerequisite
 * steps including user creation, user login, notification creation, and finally
 * the update operation.
 *
 * Test steps:
 *
 * 1. Create event organizer user via join endpoint
 * 2. Login as event organizer user to establish authentication
 * 3. Create a notification for the organizer's associated regular user
 * 4. Switch to event organizer authentication context
 * 5. Update the notification's read status and content
 * 6. Validate that the update was successful with updated fields
 */
export async function test_api_notification_update_event_organizer_success(
  connection: api.IConnection,
) {
  // 1. Create event organizer user and authenticate
  const eventOrganizerCreateBody = {
    email: `event_organizer_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: "hashed_password_sample",
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const eventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: eventOrganizerCreateBody,
    });
  typia.assert(eventOrganizer);

  // 2. Log in as the created event organizer user
  const eventOrganizerLoginBody = {
    email: eventOrganizerCreateBody.email,
    password_hash: eventOrganizerCreateBody.password_hash,
  } satisfies IEventRegistrationEventOrganizer.ILogin;

  const loggedInEventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.login(connection, {
      body: eventOrganizerLoginBody,
    });
  typia.assert(loggedInEventOrganizer);

  // 3. Create admin user and login for multi-role setup
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: "hashed_password_sample",
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const loggedInAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 4. Create a notification for a regular user, associating with the event organizer
  // Use eventOrganizer id as user_id to link notification publicly
  const notificationCreateBody = {
    user_id: eventOrganizer.id,
    type: "registration confirmation",
    content: "Your event registration is confirmed.",
    read: false,
  } satisfies IEventRegistrationNotification.ICreate;

  const notification: IEventRegistrationNotification =
    await api.functional.eventRegistration.admin.regularUsers.notifications.create(
      connection,
      {
        regularUserId: eventOrganizer.id,
        body: notificationCreateBody,
      },
    );
  typia.assert(notification);

  // 5. Switch back to event organizer login to perform update
  await api.functional.auth.eventOrganizer.login(connection, {
    body: eventOrganizerLoginBody,
  });

  // Prepare update body to mark notification as read and update content
  const notificationUpdateBody = {
    read: true,
    content: "Your event registration has been confirmed and updated.",
  } satisfies IEventRegistrationNotification.IUpdate;

  // 6. Perform update operation on the notification
  const updatedNotification: IEventRegistrationNotification =
    await api.functional.eventRegistration.eventOrganizer.notifications.update(
      connection,
      {
        notificationId: notification.id,
        body: notificationUpdateBody,
      },
    );
  typia.assert(updatedNotification);

  // 7. Validate update results
  TestValidator.equals(
    "notification id remains the same",
    updatedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "notification content updated",
    updatedNotification.content,
    notificationUpdateBody.content,
  );
  TestValidator.equals(
    "notification read flag updated",
    updatedNotification.read,
    true,
  );
}
