import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventWaitlists } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlists";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

export async function test_api_regular_user_waitlist_update_success(
  connection: api.IConnection,
) {
  // 1. Create a regular user and authenticate
  const regularUserCreation = {
    email: `${RandomGenerator.name(1)}@example.com`,
    password_hash: typia.random<string>(),
    full_name: RandomGenerator.name(2),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreation,
    });
  typia.assert(regularUser);

  // 2. Authenticate admin user
  const adminCreation = {
    email: `${RandomGenerator.name(1)}@example.com`,
    password_hash: typia.random<string>(),
    full_name: RandomGenerator.name(2),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreation,
    });
  typia.assert(adminUser);

  // 3. Authenticate admin user (login) to ensure authorization context for event creation
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminCreation.email,
      password_hash: adminCreation.password_hash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 4. Admin creates an event
  const eventCreation = {
    event_category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(2),
    date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    location: "Test Location",
    capacity: 100,
    description: "Test event description",
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreation,
    });
  typia.assert(event);

  // 5. Admin logout and login regular user for waitlist creation
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserCreation.email,
      password_hash: regularUserCreation.password_hash,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 6. Regular user creates a waitlist entry for this event
  const waitlistCreateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  } satisfies IEventRegistrationEventWaitlists.ICreate;
  const waitlistEntry: IEventRegistrationEventWaitlists =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUser.id,
        body: waitlistCreateBody,
      },
    );
  typia.assert(waitlistEntry);

  // 7. Update the waitlist entry timestamps
  const updatedCreatedAt = new Date(Date.now() - 1000 * 60 * 30).toISOString();
  const updatedUpdatedAt = new Date().toISOString();
  const waitlistUpdateBody = {
    created_at: updatedCreatedAt,
    updated_at: updatedUpdatedAt,
  } satisfies IEventRegistrationEventWaitlists.IUpdate;

  const updatedWaitlistEntry =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.updateWaitlistEntry(
      connection,
      {
        regularUserId: regularUser.id,
        eventWaitlistId: waitlistEntry.id,
        body: waitlistUpdateBody,
      },
    );
  typia.assert(updatedWaitlistEntry);

  // 8. Validate that the updates are reflected
  TestValidator.equals(
    "waitlist updated created_at",
    updatedWaitlistEntry.created_at,
    updatedCreatedAt,
  );
  TestValidator.equals(
    "waitlist updated updated_at",
    updatedWaitlistEntry.updated_at,
    updatedUpdatedAt,
  );
}
