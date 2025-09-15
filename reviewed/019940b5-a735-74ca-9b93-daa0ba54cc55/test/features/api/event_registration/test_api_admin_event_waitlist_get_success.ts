import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

export async function test_api_admin_event_waitlist_get_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64);
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPasswordHash,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPasswordHash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 2. Admin creates an event category
  const eventCategoryCreateBody = {
    name: RandomGenerator.name(),
    description: "Test category",
  } satisfies IEventRegistrationEventCategory.ICreate;
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryCreateBody,
      },
    );
  typia.assert(eventCategory);

  // 3. Admin creates an event under the created category
  const now = new Date();
  const oneDayLater = new Date(now.getTime() + 86400000 * 1).toISOString();
  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(),
    date: oneDayLater,
    location: RandomGenerator.name(),
    capacity: 100,
    description: "Test event description",
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 4. Regular user creation and authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPasswordHash = RandomGenerator.alphaNumeric(64);
  const userCreateBody = {
    email: userEmail,
    password_hash: userPasswordHash,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;
  const user: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: userEmail,
      password_hash: userPasswordHash,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 5. Admin adds the regular user to the event waitlist
  // Switch back to admin authentication
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPasswordHash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  const waitlistCreateBody = {
    event_id: event.id,
    regular_user_id: user.id,
  } satisfies IEventRegistrationEventWaitlist.ICreate;

  const waitlistEntry: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.admin.events.waitlists.create(
      connection,
      {
        eventId: event.id,
        body: waitlistCreateBody,
      },
    );
  typia.assert(waitlistEntry);

  // 6. Admin retrieves the specific waitlist entry
  const retrievedWaitlistEntry: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.admin.events.waitlists.at(
      connection,
      {
        eventId: event.id,
        eventWaitlistId: waitlistEntry.id,
      },
    );
  typia.assert(retrievedWaitlistEntry);

  // Assert the retrieved waitlist entry matches the created one
  TestValidator.equals(
    "waitlist entry id matches",
    retrievedWaitlistEntry.id,
    waitlistEntry.id,
  );
  TestValidator.equals(
    "event id matches",
    retrievedWaitlistEntry.event_id,
    event.id,
  );
  TestValidator.equals(
    "regular user id matches",
    retrievedWaitlistEntry.regular_user_id,
    user.id,
  );
}
