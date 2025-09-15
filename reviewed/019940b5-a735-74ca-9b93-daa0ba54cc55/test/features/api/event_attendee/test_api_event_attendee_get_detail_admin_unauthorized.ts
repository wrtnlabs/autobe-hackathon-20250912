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
 * Validate that unauthorized attempts to retrieve event attendee details by ID
 * fail.
 *
 * This test covers the lifecycle of creating admin and regular users, an event
 * category, an event, and an attendee registration, followed by an attempt to
 * access detailed attendee information via admin route without proper
 * authentication. It ensures that authorization controls prevent unauthorized
 * access to sensitive attendee data.
 */
export async function test_api_event_attendee_get_detail_admin_unauthorized(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUser = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    },
  );
  typia.assert(adminUser);

  // 2. Admin login
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminUser.email,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 3. Create event category
  const eventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // 4. Create event
  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(2),
    date: new Date(Date.now() + 86400000).toISOString(),
    location: RandomGenerator.name(1),
    capacity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 6,
      wordMax: 10,
    }),
    ticket_price: 1000,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event = await api.functional.eventRegistration.admin.events.create(
    connection,
    {
      body: eventCreateBody,
    },
  );
  typia.assert(event);

  // 5. Create regular user
  const regularUserPassword = RandomGenerator.alphaNumeric(12);
  const regularUser =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: regularUserPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 6. Regular user login
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUser.email,
      password_hash: regularUserPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 7. Register user as event attendee
  const attendee =
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

  // 8. Attempt to get attendee details with unauthorized connection
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized admin eventAttendee detail access should fail",
    async () => {
      await api.functional.eventRegistration.admin.eventAttendees.at(
        unauthorizedConnection,
        {
          eventAttendeeId: attendee.id,
        },
      );
    },
  );
}
