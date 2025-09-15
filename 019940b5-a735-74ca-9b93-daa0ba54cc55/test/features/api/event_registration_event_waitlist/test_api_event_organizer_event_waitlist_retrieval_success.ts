import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import type { IEventRegistrationEventWaitlists } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlists";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test retrieval of a specific event organizer waitlist entry by
 * eventWaitlistId. This scenario covers the successful retrieval of an existing
 * waitlist entry by its unique identifier for an event, ensuring only an
 * authenticated event organizer with proper authorization can access the data.
 *
 * The test performs the complete business workflow:
 *
 * 1. Event organizer and admin users are created and logged in for authentication
 *    context.
 * 2. Admin creates a new event category.
 * 3. Event organizer creates a new event under the created category.
 * 4. A regular user account is created and logged in.
 * 5. The regular user is added to the event waitlist.
 * 6. The event organizer retrieves the waitlist entry by its ID and verifies all
 *    relevant fields.
 */
export async function test_api_event_organizer_event_waitlist_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Event Organizer joins and logs in
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const organizerPassword = "password_hash_sample";
  const organizerJoinPayload = {
    email: organizerEmail,
    password_hash: organizerPassword,
    full_name: "Event Organizer",
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const eventOrganizerAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: organizerJoinPayload,
    });
  typia.assert(eventOrganizerAuthorized);

  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPassword,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 2. Admin joins and logs in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin_password_hash";
  const adminJoinPayload = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: "Admin User",
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: adminJoinPayload,
    },
  );
  typia.assert(adminAuthorized);

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 3. Admin creates event category
  const eventCategoryPayload = {
    name: `cat-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEventRegistrationEventCategory.ICreate;

  const eventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryPayload,
      },
    );
  typia.assert(eventCategory);

  // 4. Event organizer creates event
  const eventPayload = {
    event_category_id: eventCategory.id,
    name: `Event-${RandomGenerator.alphaNumeric(10)}`,
    date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    location: "Test Venue",
    capacity: 100,
    description: RandomGenerator.content({ paragraphs: 2 }),
    ticket_price: 5000,
    status: "scheduled" as const,
  } satisfies IEventRegistrationEvent.ICreate;

  const event =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: eventPayload,
      },
    );
  typia.assert(event);

  //5. Regular user joins and logs in
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "user_password_hash";
  const regularUserJoinPayload = {
    email: userEmail,
    password_hash: userPassword,
    full_name: "Regular User",
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUserAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserJoinPayload,
    });
  typia.assert(regularUserAuthorized);

  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: userEmail,
      password_hash: userPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 6. Regular user added to waitlist for the event
  const waitlistCreateBody = {
    event_id: event.id,
    regular_user_id: regularUserAuthorized.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IEventRegistrationEventWaitlists.ICreate;

  const waitlistEntry =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUserAuthorized.id,
        body: waitlistCreateBody,
      },
    );
  typia.assert(waitlistEntry);

  // 7. Event organizer retrieves waitlist entry by its ID
  const retrievedWaitlistEntry =
    await api.functional.eventRegistration.eventOrganizer.eventWaitlists.at(
      connection,
      {
        eventWaitlistId: waitlistEntry.id,
      },
    );
  typia.assert(retrievedWaitlistEntry);

  TestValidator.equals(
    "verified waitlist entry ID matches",
    retrievedWaitlistEntry.id,
    waitlistEntry.id,
  );
  TestValidator.equals(
    "verified waitlist event ID matches",
    retrievedWaitlistEntry.event_id,
    event.id,
  );
  TestValidator.equals(
    "verified waitlist regular user ID matches",
    retrievedWaitlistEntry.regular_user_id,
    regularUserAuthorized.id,
  );
  TestValidator.predicate(
    "retrieved waitlist creation date is recent",
    Date.parse(retrievedWaitlistEntry.created_at) > Date.now() - 1000 * 60 * 60,
  );
  TestValidator.predicate(
    "retrieved waitlist update date is recent",
    Date.parse(retrievedWaitlistEntry.updated_at) > Date.now() - 1000 * 60 * 60,
  );
}
