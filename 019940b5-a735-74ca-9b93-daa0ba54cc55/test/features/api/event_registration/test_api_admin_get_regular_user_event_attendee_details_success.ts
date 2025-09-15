import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Retrieve detailed event attendee record via admin API, by regular user ID
 * and event attendee ID.
 *
 * The test covers the full necessary setup including user creation, admin
 * creation and login, event category and event creation, attendee
 * registration, and then final data retrieval.
 *
 * 1. Create a regular user account with an verified email.
 * 2. Create an admin user account.
 * 3. Admin user logs in to obtain valid access token.
 * 4. Admin creates an event category.
 * 5. Admin creates an event pointing to the category.
 * 6. Admin registers the regular user as an attendee of the event.
 * 7. Admin fetches the event attendee details for the regular user and
 *    verifies the response.
 *
 * Each step includes typia.assert validations and TestValidator checks for
 * data correctness. Authentication tokens are correctly set by the SDK upon
 * login operations.
 */
export async function test_api_admin_get_regular_user_event_attendee_details_success(
  connection: api.IConnection,
) {
  // 1. Create a regular user account
  const regularUserEmail = `regularuser${RandomGenerator.alphaNumeric(6)}@example.com`;
  const regularUserPassword = "test_password_hash";
  const regularUserPayload = {
    email: regularUserEmail,
    password_hash: regularUserPassword,
    full_name: RandomGenerator.name(),
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserPayload,
    });
  typia.assert(regularUser);

  // 2. Create an admin user account
  const adminEmail = `admin${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = "admin_password_hash";
  const adminPayload = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: RandomGenerator.name(),
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminPayload,
    });
  typia.assert(adminUser);

  // 3. Admin login
  const adminLoginPayload = {
    email: adminEmail,
    password_hash: adminPassword,
  } satisfies IEventRegistrationAdmin.ILogin;

  const adminLoggedIn: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginPayload,
    });
  typia.assert(adminLoggedIn);

  // 4. Admin creates an event category
  const eventCategoryPayload = {
    name: `Category${RandomGenerator.alphaNumeric(4)}`,
    description: "Test event category",
  } satisfies IEventRegistrationEventCategory.ICreate;

  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      { body: eventCategoryPayload },
    );
  typia.assert(eventCategory);

  // 5. Admin creates an event using the created category
  const nowIsoString = new Date().toISOString();
  const eventPayload = {
    event_category_id: eventCategory.id,
    name: `Event ${RandomGenerator.alphaNumeric(5)}`,
    date: nowIsoString,
    location: "Sample Venue",
    capacity: 100,
    description: "Test event description",
    ticket_price: 20,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventPayload,
    });
  typia.assert(event);

  // 6. Admin registers the regular user as an attendee for the event
  const eventAttendeePayload = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;

  const eventAttendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.admin.regularUsers.attendees.createEventAttendeeForUser(
      connection,
      {
        regularUserId: regularUser.id,
        body: eventAttendeePayload,
      },
    );
  typia.assert(eventAttendee);

  // 7. Admin fetches the event attendee details
  const retrievedEventAttendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.admin.regularUsers.attendees.atEventAttendeeByUser(
      connection,
      {
        regularUserId: regularUser.id,
        eventAttendeeId: eventAttendee.id,
      },
    );
  typia.assert(retrievedEventAttendee);

  // Verify that retrieved details match created attendee
  TestValidator.equals(
    "event_attendee_id",
    retrievedEventAttendee.id,
    eventAttendee.id,
  );
  TestValidator.equals("event_id", retrievedEventAttendee.event_id, event.id);
  TestValidator.equals(
    "regular_user_id",
    retrievedEventAttendee.regular_user_id,
    regularUser.id,
  );
}
