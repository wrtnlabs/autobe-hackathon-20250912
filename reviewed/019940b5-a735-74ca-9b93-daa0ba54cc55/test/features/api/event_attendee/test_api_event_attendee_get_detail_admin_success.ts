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
 * Tests the successful flow of an admin user retrieving details of an event
 * attendee.
 *
 * The test covers:
 *
 * 1. Admin user creation and login
 * 2. Event category creation
 * 3. Event creation linked to the category
 * 4. Regular user creation and login
 * 5. Regular user registration as event attendee
 * 6. Admin retrieval of the event attendee detail by ID
 *
 * Each step validates the API response for correct typing and business
 * logic consistency. Authentication token handling and role switching are
 * performed following SDK protocol.
 *
 * TestValidator assertions confirm the correctness of the attendee
 * retrieval. All required properties are supplied with valid, realistic
 * values respecting format and constraints.
 */
export async function test_api_event_attendee_get_detail_admin_success(
  connection: api.IConnection,
) {
  // 1. Create admin user account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64);
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPasswordHash,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  // 2. Authenticate as admin user
  const adminLoginBody = {
    email: adminEmail,
    password_hash: adminPasswordHash,
  } satisfies IEventRegistrationAdmin.ILogin;
  const adminLoggedIn: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Create event category
  const categoryCreateBody = {
    name: `Category ${RandomGenerator.alphabets(6)}`,
    description: null,
  } satisfies IEventRegistrationEventCategory.ICreate;
  const category: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Create event linked to category
  const nowISOString = new Date().toISOString();
  const eventCreateBody = {
    event_category_id: category.id,
    name: `Event ${RandomGenerator.alphabets(6)}`,
    date: nowISOString,
    location: RandomGenerator.name(),
    capacity:
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>() + 10, // positive realistic
    description: null,
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 5. Create regular user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPasswordHash = RandomGenerator.alphaNumeric(64);
  const userCreateBody = {
    email: userEmail,
    password_hash: userPasswordHash,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: userCreateBody,
    });
  typia.assert(regularUser);

  // 6. Authenticate as regular user
  const userLoginBody = {
    email: userEmail,
    password_hash: userPasswordHash,
  } satisfies IEventRegistrationRegularUser.ILogin;
  const regularUserLoggedIn: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: userLoginBody,
    });
  typia.assert(regularUserLoggedIn);

  // 7. Register regular user as event attendee
  const attendeeCreateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;
  const attendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.regularUser.eventAttendees.create(
      connection,
      {
        body: attendeeCreateBody,
      },
    );
  typia.assert(attendee);

  // 8. Switch back to admin user authentication
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: adminLoginBody,
  });

  // 9. Retrieve attendee detail by admin
  const attendeeDetail: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.admin.eventAttendees.at(connection, {
      eventAttendeeId: attendee.id,
    });
  typia.assert(attendeeDetail);

  // Validate the attendee details returned
  TestValidator.equals("attendee id matches", attendeeDetail.id, attendee.id);
  TestValidator.equals("event id matches", attendeeDetail.event_id, event.id);
  TestValidator.equals(
    "user id matches",
    attendeeDetail.regular_user_id,
    regularUser.id,
  );
}
