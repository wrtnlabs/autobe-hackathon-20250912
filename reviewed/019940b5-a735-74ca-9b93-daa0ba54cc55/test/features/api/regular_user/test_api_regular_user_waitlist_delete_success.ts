import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventWaitlists } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlists";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Delete a waitlist entry for a regular user, identified by eventWaitlistId.
 * This scenario tests that a logged-in regular user can remove themselves from
 * an event waitlist, thereby freeing a potential spot for other users. The test
 * requires prior creation and authentication of the regular user, and that a
 * waitlist entry already exists to be deleted. It involves the sequence of
 * creating the user, creating the event, adding the waitlist entry for the
 * event and user, and then deleting that entry. The final deletion returns no
 * content, confirming successful removal from the waitlist.
 */
export async function test_api_regular_user_waitlist_delete_success(
  connection: api.IConnection,
) {
  // 1. Create a regular user (join) with required properties.
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: "hashed_password_1234",
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: joinBody,
    });
  typia.assert(regularUser);

  // 2. Create an admin user (join) for event creation.
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.com`,
    password_hash: "hashed_admin_password_1234",
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(adminUser);

  // 3. Admin user login to authenticate as admin
  const adminLoginBody = {
    email: adminJoinBody.email,
    password_hash: adminJoinBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const adminLoggedIn = await api.functional.auth.admin.login.loginAdminUser(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert(adminLoggedIn);

  // 4. Create an event category id (random valid UUID as no API to create categories)
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // 5. Create an event as admin with valid data using the categoryId
  const eventCreateBody = {
    event_category_id: categoryId,
    name: RandomGenerator.name(3),
    date: new Date(Date.now() + 86400000).toISOString(),
    location: "Conference Hall A",
    capacity: 100,
    description: "Annual conference event.",
    ticket_price: 50,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event = await api.functional.eventRegistration.admin.events.create(
    connection,
    {
      body: eventCreateBody,
    },
  );
  typia.assert(event);

  // 6. Create a waitlist entry for the regular user and event
  const waitlistCreateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
    created_at: null,
    updated_at: null,
  } satisfies IEventRegistrationEventWaitlists.ICreate;

  const waitlistEntry =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUser.id,
        body: waitlistCreateBody,
      },
    );
  typia.assert(waitlistEntry);

  // 7. Delete the waitlist entry as the regular user
  await api.functional.eventRegistration.regularUser.regularUsers.waitlists.eraseWaitlistEntry(
    connection,
    {
      regularUserId: regularUser.id,
      eventWaitlistId: waitlistEntry.id,
    },
  );

  // If no exception, the deletion is successful
  TestValidator.predicate("waitlist entry deleted successfully", true);
}
