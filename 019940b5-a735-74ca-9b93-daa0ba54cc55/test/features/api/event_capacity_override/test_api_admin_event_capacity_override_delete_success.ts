import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";

/**
 * Comprehensive E2E test for the deletion of an event capacity override
 * record by an admin user.
 *
 * This test workflow simulates a real-world scenario where an admin user
 * creates an event category, an event under that category, enables a
 * capacity override for that event, and then deletes the override. It
 * includes authentication handling, role enforcement, and negative test
 * cases for unauthorized access and non-existent record deletion.
 *
 * Steps:
 *
 * 1. Admin user creation (join) and login to establish auth context.
 * 2. Creation of an event category.
 * 3. Creation of an event linked to the event category.
 * 4. Creation of an event capacity override linked to the event with override
 *    enabled.
 * 5. Deletion of the event capacity override record by its ID.
 * 6. Validation of unauthorized deletion attempts yielding expected failures.
 * 7. Validation that deleting a non-existent override ID results in a proper
 *    error.
 *
 * All API responses are validated using typia.assert, and all outcomes are
 * checked via TestValidator.
 */
export async function test_api_admin_event_capacity_override_delete_success(
  connection: api.IConnection,
) {
  // 1. Create admin user and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  // Create admin using join
  const createdAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: "passwordHash123!",
        full_name: adminFullName,
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Login admin user for authentication
  const loggedInAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: "passwordHash123!",
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 2. Create an event category
  const eventCategoryName = `category_${RandomGenerator.alphaNumeric(5)}`;
  const createdCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: eventCategoryName,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "event category created name matches",
    createdCategory.name,
    eventCategoryName,
  );

  // 3. Create an event linked to the category
  const eventName = `event_${RandomGenerator.alphaNumeric(6)}`;
  const eventDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
  const eventLocation = RandomGenerator.name(3);
  const eventCapacity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const ticketPrice = typia.random<number>() >= 0 ? typia.random<number>() : 0;
  const eventStatus = "scheduled" as const;

  const createdEvent: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: {
        event_category_id: createdCategory.id,
        name: eventName,
        date: eventDate,
        location: eventLocation,
        capacity: eventCapacity >= 1 ? eventCapacity : 10,
        description: RandomGenerator.content({ paragraphs: 2 }),
        ticket_price: ticketPrice >= 0 ? ticketPrice : 0,
        status: eventStatus,
      } satisfies IEventRegistrationEvent.ICreate,
    });
  typia.assert(createdEvent);
  TestValidator.equals(
    "event created name matches",
    createdEvent.name,
    eventName,
  );

  // 4. Create an event capacity override
  const isOverrideEnabled = true;
  const createdOverride: IEventRegistrationEventCapacityOverride =
    await api.functional.eventRegistration.admin.eventCapacityOverrides.createEventCapacityOverride(
      connection,
      {
        body: {
          event_id: createdEvent.id,
          is_override_enabled: isOverrideEnabled,
        } satisfies IEventRegistrationEventCapacityOverride.ICreate,
      },
    );
  typia.assert(createdOverride);
  TestValidator.equals(
    "override event_id matches",
    createdOverride.event_id,
    createdEvent.id,
  );
  TestValidator.predicate(
    "override is_override_enabled is true",
    createdOverride.is_override_enabled,
  );

  // 5. Delete the event capacity override by its ID
  await api.functional.eventRegistration.admin.eventCapacityOverrides.erase(
    connection,
    {
      eventCapacityOverrideId: createdOverride.id,
    },
  );

  // 6. Validate error on unauthorized deletion attempt by creating a new connection without auth
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.eventRegistration.admin.eventCapacityOverrides.erase(
        unauthConnection,
        { eventCapacityOverrideId: createdOverride.id },
      );
    },
  );

  // 7. Validate error when deleting a non-existent record
  await TestValidator.error(
    "deletion of non-existent override should fail",
    async () => {
      await api.functional.eventRegistration.admin.eventCapacityOverrides.erase(
        connection,
        {
          eventCapacityOverrideId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
