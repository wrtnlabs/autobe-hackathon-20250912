import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import type { IEventRegistrationEventWaitlists } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlists";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * This test validates the complete workflow of an admin creating an event, an
 * event organizer and regular user signing up and authenticating, the regular
 * user creating a waitlist entry for the event, and the event organizer
 * retrieving the detailed waitlist entry. It ensures multi-role authentication,
 * proper event and waitlist creation, and verifies the validity and consistency
 * of the waitlist entry data retrieved.
 */
export async function test_api_event_organizer_waitlist_at_success(
  connection: api.IConnection,
) {
  // Admin user creation and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
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

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // Event Organizer creation and authentication
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const organizerPassword = RandomGenerator.alphaNumeric(10);
  const organizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: organizerEmail,
        password_hash: organizerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  typia.assert(organizer);

  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPassword,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // Regular User creation and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: userEmail,
        password_hash: userPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: userEmail,
      password_hash: userPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // Admin creates an event
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: {
        event_category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        date: new Date(Date.now() + 864e5).toISOString(), // tomorrow
        location: RandomGenerator.name(),
        capacity: 100,
        description: RandomGenerator.content({ paragraphs: 1 }),
        ticket_price: 50,
        status: "scheduled",
      } satisfies IEventRegistrationEvent.ICreate,
    });
  typia.assert(event);

  // Regular user creates the waitlist entry
  const waitlistEntry: IEventRegistrationEventWaitlists =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUser.id,
        body: {
          event_id: event.id,
          regular_user_id: regularUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies IEventRegistrationEventWaitlists.ICreate,
      },
    );
  typia.assert(waitlistEntry);

  // Switch authentication to event organizer to retrieve waitlist detail
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPassword,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // Event organizer retrieves detailed waitlist entry
  const waitlistDetail: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.eventOrganizer.regularUsers.waitlists.at(
      connection,
      {
        regularUserId: regularUser.id,
        eventWaitlistId: waitlistEntry.id,
      },
    );
  typia.assert(waitlistDetail);

  // Validate waitlist detail matches expected values
  TestValidator.equals(
    "waitlist event id matches",
    waitlistDetail.event_id,
    event.id,
  );
  TestValidator.equals(
    "waitlist regular user id matches",
    waitlistDetail.regular_user_id,
    regularUser.id,
  );
}
