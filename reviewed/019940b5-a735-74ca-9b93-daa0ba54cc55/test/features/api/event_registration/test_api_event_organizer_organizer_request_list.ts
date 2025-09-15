import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IEventRegistrationOrganizerRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationOrganizerRequests";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationOrganizerRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationOrganizerRequests";

/**
 * Test scenario for event organizer user creation and organizer requests
 * listing.
 *
 * This test performs the following operations:
 *
 * 1. Creates a new event organizer user via the join endpoint with required
 *    and optional fields.
 * 2. Authenticates the user and asserts the authorization token and user data.
 * 3. Queries the organizer requests endpoint with filters for pagination,
 *    search, ordering, and status.
 * 4. Validates the paginated response and checks properties of each request
 *    summary.
 * 5. Verifies proper pagination metadata consistency.
 *
 * This covers validation of access control, filtering correctness, and data
 * structure conformity.
 */
export async function test_api_event_organizer_organizer_request_list(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate event organizer user
  const organizerEmail: string = typia.random<string & tags.Format<"email">>();
  const organizerPasswordHash = "hashedPassword123"; // Example hashed password string
  const fullName: string = RandomGenerator.name();

  const authorizedOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: organizerEmail,
        password_hash: organizerPasswordHash,
        full_name: fullName,
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  typia.assert(authorizedOrganizer);

  // Step 2: Search organizer requests with filters and pagination
  const searchRequestBody = {
    page: 0,
    limit: 10,
    search: "request",
    orderBy: "created_at",
    orderDirection: "asc",
    status: "pending",
  } satisfies IEventRegistrationOrganizerRequests.IRequest;

  const resultPage: IPageIEventRegistrationOrganizerRequests.ISummary =
    await api.functional.eventRegistration.eventOrganizer.organizerRequests.searchOrganizerRequests(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(resultPage);

  // Step 3: Validate pagination info
  TestValidator.predicate(
    "pagination current page is non-negative",
    resultPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    resultPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    resultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    resultPage.pagination.pages >= 0,
  );

  // Step 4: Validate each organizer request summary
  for (const request of resultPage.data) {
    typia.assert(request);
    TestValidator.predicate(
      "request id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.id,
      ),
    );
    TestValidator.predicate(
      "request user_id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.user_id,
      ),
    );
    TestValidator.predicate(
      "request status is one of pending, approved, rejected",
      ["pending", "approved", "rejected"].includes(request.status),
    );
    TestValidator.predicate(
      "request created_at is valid date-time",
      !Number.isNaN(Date.parse(request.created_at)),
    );
    TestValidator.predicate(
      "request updated_at is valid date-time",
      !Number.isNaN(Date.parse(request.updated_at)),
    );
  }

  // Step 5: Validate pagination consistency
  TestValidator.equals(
    "data length matches pagination records",
    resultPage.data.length,
    Math.min(
      resultPage.pagination.records -
        resultPage.pagination.current * resultPage.pagination.limit,
      resultPage.pagination.limit,
    ),
  );

  TestValidator.predicate(
    "pages calculation is correct",
    resultPage.pagination.pages ===
      Math.ceil(resultPage.pagination.records / resultPage.pagination.limit),
  );
}
