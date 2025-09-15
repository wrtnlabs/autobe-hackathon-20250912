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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAttendee";

export async function test_api_event_attendee_list_query_admin_success(
  connection: api.IConnection,
) {
  // Step 1: Admin user creation and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // Simulate hashed password

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
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
      password_hash: adminPasswordHash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // Step 2: Create event category
  const categoryName = RandomGenerator.name();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });
  const category: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create event under the category
  const eventName = RandomGenerator.name(3);
  const eventDate: string = new Date(Date.now() + 86400000).toISOString(); // 1 day from now
  const eventLocation = RandomGenerator.name(4);
  const eventCapacity = 100;
  const eventDescription = RandomGenerator.content({ paragraphs: 2 });

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: {
        event_category_id: category.id,
        name: eventName,
        date: eventDate,
        location: eventLocation,
        capacity: eventCapacity satisfies number & tags.Type<"int32">,
        description: eventDescription,
        ticket_price: 0,
        status: "scheduled",
      } satisfies IEventRegistrationEvent.ICreate,
    });
  typia.assert(event);

  // Step 4: Regular user creation and login
  const regularUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const regularUserPasswordHash = RandomGenerator.alphaNumeric(32);

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPasswordHash,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // Step 5: Create event attendee linking regular user and event
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

  // Step 6: Switch back to admin to query event attendees list
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPasswordHash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  const pageRequest: IEventRegistrationEventAttendee.IRequest = {
    page: 1,
    limit: 10,
    event_id: event.id,
  };

  const pagedAttendees: IPageIEventRegistrationEventAttendee.ISummary =
    await api.functional.eventRegistration.admin.events.attendees.index(
      connection,
      {
        eventId: event.id,
        body: pageRequest,
      },
    );
  typia.assert(pagedAttendees);

  // Validate pagination metadata
  TestValidator.predicate(
    "page current is 1",
    pagedAttendees.pagination.current === 1,
  );
  TestValidator.predicate(
    "page limit is 10",
    pagedAttendees.pagination.limit === 10,
  );
  TestValidator.predicate(
    "page records count is at least 1",
    pagedAttendees.pagination.records >= 1,
  );
  TestValidator.predicate(
    "page total pages count is at least 1",
    pagedAttendees.pagination.pages >= 1,
  );

  // Validate returned data contains the created attendee
  const found = pagedAttendees.data.find(
    (a) =>
      a.id === attendee.id &&
      a.event_id === event.id &&
      a.regular_user_id === regularUser.id,
  );
  typia.assert(found!);
  TestValidator.predicate("contains created attendee", found !== undefined);
}
