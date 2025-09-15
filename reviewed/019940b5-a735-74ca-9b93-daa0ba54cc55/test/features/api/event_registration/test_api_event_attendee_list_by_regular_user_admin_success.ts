import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAttendee";

/**
 * Test successful listing of event attendees by admin user for a regular
 * user.
 *
 * This test performs the following steps:
 *
 * 1. Create an admin user and authenticate as admin.
 * 2. Create a regular user.
 * 3. Create multiple event attendee records associated with the regular user.
 * 4. Retrieve the list of event attendees for the regular user with pagination
 *    and filtering.
 * 5. Validate that the retrieved attendees match those created, including
 *    pagination info.
 * 6. Validate role-based access and data integrity.
 */
export async function test_api_event_attendee_list_by_regular_user_admin_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "p@ssw0rd";
  const adminUser: IEventRegistrationAdmin.IAuthorized =
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
  typia.assert(adminUser);

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 2. Create a regular user
  const regularUserEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const regularUserPassword = "p@ssw0rd";
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 3. Create multiple event attendees for the regular user
  const attendeeCount = 5;
  const createdAttendees: IEventRegistrationEventAttendee[] = [];
  for (let i = 0; i < attendeeCount; i++) {
    const attendee =
      await api.functional.eventRegistration.admin.regularUsers.attendees.createEventAttendeeForUser(
        connection,
        {
          regularUserId: regularUser.id,
          body: {
            event_id: typia.random<string & tags.Format<"uuid">>(),
            regular_user_id: regularUser.id,
          } satisfies IEventRegistrationEventAttendee.ICreate,
        },
      );
    typia.assert(attendee);
    createdAttendees.push(attendee);
  }

  // 4. Retrieve the list of event attendees for regular user with pagination
  const pageSize: number & tags.Type<"int32"> & tags.Minimum<1> =
    3 satisfies number as number;
  const pageNumber: number & tags.Type<"int32"> & tags.Minimum<1> =
    1 satisfies number as number;

  const requestBody: IEventRegistrationEventAttendee.IRequest = {
    page: pageNumber,
    limit: pageSize,
    regular_user_id: regularUser.id,
  };

  const listing: IPageIEventRegistrationEventAttendee.ISummary =
    await api.functional.eventRegistration.admin.regularUsers.attendees.indexEventAttendeesByUser(
      connection,
      {
        regularUserId: regularUser.id,
        body: requestBody,
      },
    );
  typia.assert(listing);

  // 5. Validate pagination info
  TestValidator.predicate(
    "pagination current page should be equal to requested page",
    listing.pagination.current === pageNumber,
  );
  TestValidator.predicate(
    "pagination limit should match requested limit",
    listing.pagination.limit === pageSize,
  );
  TestValidator.predicate(
    "pagination records should be at least number of created attendees",
    listing.pagination.records >= attendeeCount,
  );
  TestValidator.predicate(
    "pagination pages should be coherent with records and limit",
    listing.pagination.pages >= 1 &&
      listing.pagination.pages ===
        Math.ceil(listing.pagination.records / listing.pagination.limit),
  );

  // 6. Validate that all returned attendee summaries belong to the regular user
  TestValidator.predicate(
    "all attendees' regular_user_id should match the regular user id",
    listing.data.every(
      (attendee) => attendee.regular_user_id === regularUser.id,
    ),
  );

  // 7. Validate that attendees in response match the created attendees by ids
  const createdAttendeeIds = new Set(createdAttendees.map((a) => a.id));
  listing.data.forEach((attendee) => {
    TestValidator.predicate(
      `attendee id ${attendee.id} must be found in created attendees`,
      createdAttendeeIds.has(attendee.id),
    );
  });

  // 8. Validate date-time format correctness via typia.assert ensures this
}
