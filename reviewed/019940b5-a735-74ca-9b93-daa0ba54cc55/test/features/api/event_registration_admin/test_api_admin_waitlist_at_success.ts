import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import type { IEventRegistrationEventWaitlists } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlists";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

export async function test_api_admin_waitlist_at_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass1234";
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: null,
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

  // 2. Regular user creation and login
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPass5678";
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: userEmail,
        password_hash: userPassword,
        full_name: RandomGenerator.name(),
        phone_number: null,
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

  // Switch to admin user context again for admin operations
  // Login again to maintain admin token
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 3. Create event as admin
  const eventCategoryId = typia.random<string & tags.Format<"uuid">>();
  const eventDate = new Date(Date.now() + 86400000 /* +1 day */).toISOString();
  const eventLocation = RandomGenerator.name(2);
  const eventCapacity = 100;
  const eventTicketPrice = 50;
  const eventStatus: "scheduled" = "scheduled";

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: {
        event_category_id: eventCategoryId,
        name: RandomGenerator.name(3),
        date: eventDate,
        location: eventLocation,
        capacity: eventCapacity,
        description: "Sample test event",
        ticket_price: eventTicketPrice,
        status: eventStatus,
      } satisfies IEventRegistrationEvent.ICreate,
    });
  typia.assert(event);

  // 4. Create waitlist entry as regular user
  const waitlistEntry: IEventRegistrationEventWaitlists =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUser.id,
        body: {
          event_id: event.id,
          regular_user_id: regularUser.id,
          created_at: null,
          updated_at: null,
        } satisfies IEventRegistrationEventWaitlists.ICreate,
      },
    );
  typia.assert(waitlistEntry);

  // 5. As admin, retrieve the waitlist entry detail
  const waitlistDetail: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.admin.regularUsers.waitlists.at(
      connection,
      {
        regularUserId: regularUser.id,
        eventWaitlistId: waitlistEntry.id,
      },
    );
  typia.assert(waitlistDetail);

  // 6. Validate retrieved waitlist entry fields
  TestValidator.equals(
    "waitlist id matches",
    waitlistDetail.id,
    waitlistEntry.id,
  );
  TestValidator.equals("event id matches", waitlistDetail.event_id, event.id);
  TestValidator.equals(
    "regular user id matches",
    waitlistDetail.regular_user_id,
    regularUser.id,
  );
  TestValidator.predicate(
    "created_at is valid date",
    typeof waitlistDetail.created_at === "string" &&
      waitlistDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    typeof waitlistDetail.updated_at === "string" &&
      waitlistDetail.updated_at.length > 0,
  );
}
