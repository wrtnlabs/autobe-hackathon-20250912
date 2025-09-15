import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationOrganizerRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationOrganizerRequests";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationOrganizerRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationOrganizerRequests";

/**
 * Test listing of event organizer requests with filters, pagination, and
 * sorting by an authenticated admin user.
 *
 * This test function performs the following steps:
 *
 * 1. Create and authenticate an admin user via /auth/admin/join.
 * 2. Perform listing of organizer requests with default pagination and no
 *    filters.
 * 3. Test filtering by 'pending', 'approved', and 'rejected' statuses.
 * 4. Test pagination by requesting different pages and limits.
 * 5. Test ordering using orderBy and orderDirection fields.
 * 6. Validate that response objects are correct according to
 *    IPageIEventRegistrationOrganizerRequests.ISummary schema.
 * 7. Assert the contents correspond to the applied filters and pagination
 *    constraints.
 *
 * The test will ensure that the backend correctly processes listing queries
 * under various filter conditions, maintains pagination integrity, and
 * enforces admin authorization requirements.
 */
export async function test_api_organizer_request_listing_successful(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Perform listing with default pagination and no filters
  const defaultRequest = {
    page: null,
    limit: null,
    search: null,
    orderBy: null,
    orderDirection: null,
    status: null,
  } satisfies IEventRegistrationOrganizerRequests.IRequest;
  const defaultListing =
    await api.functional.eventRegistration.admin.organizerRequests.searchOrganizerRequests(
      connection,
      {
        body: defaultRequest,
      },
    );
  typia.assert(defaultListing);
  TestValidator.predicate(
    "default listing has valid pagination",
    defaultListing.pagination.current >= 0 &&
      defaultListing.pagination.limit > 0 &&
      defaultListing.pagination.records >= 0,
  );

  // Function to test status filter
  async function testStatusFilter(status: "pending" | "approved" | "rejected") {
    const request = {
      status,
    } satisfies IEventRegistrationOrganizerRequests.IRequest;
    const listing =
      await api.functional.eventRegistration.admin.organizerRequests.searchOrganizerRequests(
        connection,
        {
          body: request,
        },
      );
    typia.assert(listing);
    TestValidator.predicate(
      `all results have status ${status}`,
      listing.data.every((item) => item.status === status),
    );
  }

  // 3. Test filtering by status
  await testStatusFilter("pending");
  await testStatusFilter("approved");
  await testStatusFilter("rejected");

  // 4. Test pagination parameters
  const paginationRequest1 = {
    page: 0,
    limit: 5,
  } satisfies IEventRegistrationOrganizerRequests.IRequest;
  const page1 =
    await api.functional.eventRegistration.admin.organizerRequests.searchOrganizerRequests(
      connection,
      {
        body: paginationRequest1,
      },
    );
  typia.assert(page1);
  TestValidator.equals("pagination page 0", page1.pagination.current, 0);
  TestValidator.equals("pagination limit 5", page1.pagination.limit, 5);
  TestValidator.predicate(
    "page1 data length less or equal to 5",
    page1.data.length <= 5,
  );

  const paginationRequest2 = {
    page: 1,
    limit: 10,
  } satisfies IEventRegistrationOrganizerRequests.IRequest;
  const page2 =
    await api.functional.eventRegistration.admin.organizerRequests.searchOrganizerRequests(
      connection,
      {
        body: paginationRequest2,
      },
    );
  typia.assert(page2);
  TestValidator.equals("pagination page 1", page2.pagination.current, 1);
  TestValidator.equals("pagination limit 10", page2.pagination.limit, 10);
  TestValidator.predicate(
    "page2 data length less or equal to 10",
    page2.data.length <= 10,
  );

  // 5. Test ordering
  const orderRequest = {
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IEventRegistrationOrganizerRequests.IRequest;
  const orderedPage =
    await api.functional.eventRegistration.admin.organizerRequests.searchOrganizerRequests(
      connection,
      {
        body: orderRequest,
      },
    );
  typia.assert(orderedPage);

  // 6. Assert that items are sorted descending by created_at
  if (orderedPage.data.length > 1) {
    for (let i = 1; i < orderedPage.data.length; i++) {
      TestValidator.predicate(
        "order by created_at descending",
        orderedPage.data[i - 1].created_at >= orderedPage.data[i].created_at,
      );
    }
  }
}
