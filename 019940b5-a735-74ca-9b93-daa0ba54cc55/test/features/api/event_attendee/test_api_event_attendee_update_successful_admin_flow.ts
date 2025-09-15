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
 * This e2e test verifies that an admin user can successfully update an existing
 * event attendee record after completing all prerequisite operations.
 *
 * The test covers the workflow from admin and regular user registration, event
 * category and event creation, attendee registration by regular user, and
 * finally admin update of the attendee record.
 *
 * It ensures all APIs operate correctly with proper data, and verifies response
 * correctness including business logic validation.
 *
 * Steps:
 *
 * 1. Admin user registers and authenticates.
 * 2. Admin creates event category.
 * 3. Admin creates event under the category.
 * 4. Regular user registers and authenticates.
 * 5. Regular user registers as event attendee.
 * 6. Admin switches session by login.
 * 7. Admin updates attendee record with valid partial data.
 * 8. Validates response correctness and business logic.
 */
export async function test_api_event_attendee_update_successful_admin_flow(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securepassword123";
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates event category
  const eventCategoryName = `Category ${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 })}`;
  const category: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: eventCategoryName,
          description: `Description for ${eventCategoryName}`,
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Admin creates event
  const eventName = `Event ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const now = new Date();
  const eventDateISOString = new Date(
    now.getTime() + 86400000 * 7,
  ).toISOString(); // 7 days from now
  const eventCapacity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
  >() satisfies number as number;
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: {
        event_category_id: category.id,
        name: eventName,
        date: eventDateISOString,
        location: "Convention Center Hall A",
        capacity: eventCapacity,
        description: `Detailed description of ${eventName}`,
        ticket_price: 50,
        status: "scheduled",
      } satisfies IEventRegistrationEvent.ICreate,
    });
  typia.assert(event);

  // 4. Regular user joins and authenticates
  const regularUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const regularUserPassword = "userpass123";
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 5. Regular user creates event attendee record
  const attendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.regularUser.eventAttendees.create(
      connection,
      {
        body: {
          event_id: event.id,
          regular_user_id: regularUser.id,
        } satisfies IEventRegistrationEventAttendee.ICreate,
      },
    );
  typia.assert(attendee);

  // 6. Admin user logs in again to ensure admin session
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 7. Admin updates the event attendee record
  // Partial update, changing updated_at timestamp to current time
  const updatedAt = new Date().toISOString();
  const updateBody = {
    updated_at: updatedAt,
  } satisfies IEventRegistrationEventAttendee.IUpdate;

  const updatedAttendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.admin.eventAttendees.update(
      connection,
      {
        eventAttendeeId: attendee.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAttendee);

  // 8. Validate updated attendee
  TestValidator.equals(
    "event attendee id should remain same",
    updatedAttendee.id,
    attendee.id,
  );
  TestValidator.equals(
    "event attendee updated_at should match update",
    updatedAttendee.updated_at,
    updatedAt,
  );
}
