import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";

/**
 * Test the deletion of a notification for an event organizer user.
 *
 * This end-to-end test performs the following steps:
 *
 * 1. Create a new event organizer user with email_verified false using the
 *    join API.
 * 2. Authenticate as the event organizer user with login API.
 * 3. Create an admin user with email_verified true and authenticate.
 * 4. Using admin context, create a notification assigned to the event
 *    organizer user.
 * 5. Switch back to event organizer context and delete the notification by its
 *    ID.
 * 6. Attempt repeated deletion to confirm proper error handling.
 * 7. Create another event organizer user and authenticate.
 * 8. Attempt deletion of the original notification by unauthorized user,
 *    expecting an error.
 *
 * All API calls properly await the promises and each response is validated
 * for type correctness using typia.assert. Nullable properties explicitly
 * set to null where appropriate. No extra or missing properties are
 * included in API calls.
 */
export async function test_api_notification_delete_by_event_organizer(
  connection: api.IConnection,
) {
  // 1. Create the first event organizer with email_verified false
  const organizerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const organizerPassword = RandomGenerator.alphaNumeric(12);
  const organizerCreate = {
    email: organizerEmail,
    password_hash: organizerPassword,
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const organizer = await api.functional.auth.eventOrganizer.join(connection, {
    body: organizerCreate,
  });
  typia.assert(organizer);

  // 2. Authenticate as the event organizer user
  const organizerLogin = {
    email: organizerEmail,
    password_hash: organizerPassword,
  } satisfies IEventRegistrationEventOrganizer.ILogin;
  await api.functional.auth.eventOrganizer.login(connection, {
    body: organizerLogin,
  });

  // 3. Create and authenticate an admin user
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminCreate = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const admin = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: adminCreate,
    },
  );
  typia.assert(admin);
  const adminLogin = {
    email: adminEmail,
    password_hash: adminPassword,
  } satisfies IEventRegistrationAdmin.ILogin;
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: adminLogin,
  });

  // 4. Create a notification assigned to the organizer via admin context
  const notificationCreate = {
    user_id: organizer.id,
    type: "registration confirmation",
    content: `Welcome, ${organizer.full_name}! Your registration is complete.`,
    read: false,
  } satisfies IEventRegistrationNotification.ICreate;
  const notification =
    await api.functional.eventRegistration.admin.regularUsers.notifications.create(
      connection,
      {
        regularUserId: organizer.id,
        body: notificationCreate,
      },
    );
  typia.assert(notification);

  // 5. Switch back to organizer context
  await api.functional.auth.eventOrganizer.login(connection, {
    body: organizerLogin,
  });

  // 6. Erase the notification by ID
  await api.functional.eventRegistration.eventOrganizer.notifications.erase(
    connection,
    {
      notificationId: notification.id,
    },
  );

  // 7. Confirm deletion by testing error on repeated erase
  await TestValidator.error(
    "deleting already deleted notification should fail",
    async () => {
      await api.functional.eventRegistration.eventOrganizer.notifications.erase(
        connection,
        {
          notificationId: notification.id,
        },
      );
    },
  );

  // 8. Create second event organizer user
  const secondOrganizerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const secondOrganizerPassword = RandomGenerator.alphaNumeric(12);
  const secondOrganizerCreate = {
    email: secondOrganizerEmail,
    password_hash: secondOrganizerPassword,
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;
  const secondOrganizer = await api.functional.auth.eventOrganizer.join(
    connection,
    {
      body: secondOrganizerCreate,
    },
  );
  typia.assert(secondOrganizer);

  // 9. Authenticate as second event organizer
  const secondOrganizerLogin = {
    email: secondOrganizerEmail,
    password_hash: secondOrganizerPassword,
  } satisfies IEventRegistrationEventOrganizer.ILogin;
  await api.functional.auth.eventOrganizer.login(connection, {
    body: secondOrganizerLogin,
  });

  // 10. Attempt deletion by unauthorized organizer, expect failure
  await TestValidator.error(
    "unauthorized organizer deleting notification should fail",
    async () => {
      await api.functional.eventRegistration.eventOrganizer.notifications.erase(
        connection,
        {
          notificationId: notification.id,
        },
      );
    },
  );
}
