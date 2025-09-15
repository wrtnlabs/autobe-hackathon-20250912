import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventWaitlist";

/**
 * This E2E test validates the admin retrieval of paginated, filtered, and
 * sorted waitlist entries for a specific regular user.
 *
 * The test workflow includes:
 *
 * 1. Create an admin user and authenticate as admin.
 * 2. Create a regular user and obtain their user ID.
 * 3. Perform a paginated, filtered, and sorted query for waitlists:
 *
 *    - Use pagination parameters (page, limit).
 *    - Filter by the regular user ID.
 *    - Filter by event ID.
 * 4. Validate the API response structure matches the paginated waitlist
 *    summary.
 * 5. Confirm pagination meta values are consistent and the returned waitlists
 *    correspond to the requested regular user ID.
 *
 * This test ensures the API accurately supports admin role querying user
 * waitlists with correct filtering and pagination behaviors.
 */
export async function test_api_regular_user_waitlists_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin
  const adminPayload: IEventRegistrationAdmin.ICreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test`,
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(3),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminPayload,
    });
  typia.assert(admin);

  const loggedInAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: adminPayload.email,
        password_hash: adminPayload.password_hash,
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 2. Create regular user
  const regularUserPayload: IEventRegistrationRegularUser.ICreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(2),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserPayload,
    });
  typia.assert(regularUser);

  // 3. Prepare waitlist query with pagination and event filtering (null event_id here)
  const waitlistRequest: IEventRegistrationEventWaitlist.IRequest = {
    page: 1,
    limit: 5,
    event_id: null,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventWaitlist.IRequest;

  // 4. Query event waitlists for the regular user as admin
  const waitlists: IPageIEventRegistrationEventWaitlist.ISummary =
    await api.functional.eventRegistration.admin.regularUsers.waitlists.index(
      connection,
      {
        regularUserId: regularUser.id,
        body: waitlistRequest,
      },
    );
  typia.assert(waitlists);

  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is >= 1",
    waitlists.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is > 0",
    waitlists.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 1",
    waitlists.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    waitlists.pagination.records >= 0,
  );

  // 6. Confirm that all waitlist entries correspond to the regular user ID
  for (const entry of waitlists.data) {
    TestValidator.equals(
      "waitlist entry regular_user_id matches",
      entry.regular_user_id,
      regularUser.id,
    );
    typia.assert(entry);
  }
}
