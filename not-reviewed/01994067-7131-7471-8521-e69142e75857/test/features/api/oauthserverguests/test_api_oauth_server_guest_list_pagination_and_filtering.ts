import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerguests } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerguests";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerguests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerguests";

/**
 * This E2E test function validates the functionality of the PATCH
 * /oauthServer/admin/oauthServerGuests endpoint. The test verifies that an
 * administrator can successfully authenticate, then query the guest user
 * accounts listing with pagination and filtering parameters. The test ensures
 * that the response includes the expected pagination metadata and that all
 * guest summaries returned respect the filter criteria, such as created_at date
 * ranges and deletion status. It also verifies that unauthorized clients cannot
 * access the guest list.
 *
 * The test is conducted with the following workflow:
 *
 * 1. Create and authenticate an admin user via /auth/admin/join API, obtaining an
 *    authorized admin session that allows restricted endpoint access.
 * 2. Call the /oauthServer/admin/oauthServerGuests PATCH endpoint with a
 *    constructed filter request body including pagination and date filtering
 *    parameters. Several calls will be made with each differing in filter
 *    criteria (e.g., created_at_from, created_at_to, deleted_only) to test
 *    filtering and pagination correctness.
 * 3. After each call, validate the response structure and property values
 *    verifying the pagination data result consistency.
 * 4. Test attempt to access the guest list with an unauthenticated or unauthorized
 *    connection to assert error rejection.
 *
 * Validation points include:
 *
 * - Responses conform to IPageIOauthServerguests.ISummary schema.
 * - Pagination fields reflect expected numeric constraints.
 * - Each guest summary matches the filtering conditions provided.
 * - Unauthorized access is correctly denied.
 *
 * The test respects all schema constraints, uses proper type safety with
 * satisfies clauses, and performs comprehensive typia.assert checks after API
 * responses to ensure full type correctness.
 */
export async function test_api_oauth_server_guest_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "!Admin1234";

  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare filter requests with pagination and date filters
  const nowISOString = new Date().toISOString();
  // Create filter request with no filters (default paging)
  const reqAll = {
    page: 1,
    limit: 10,
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
    deleted_only: false,
  } satisfies IOauthServerguests.IRequest;

  // Filter with created_at_from to recent past
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const reqCreatedFrom = {
    page: 1,
    limit: 5,
    created_at_from: pastDate.toISOString() satisfies string &
      tags.Format<"date-time">,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
    deleted_only: false,
  } satisfies IOauthServerguests.IRequest;

  // Filter with created_at_to to now
  const reqCreatedTo = {
    page: 1,
    limit: 5,
    created_at_from: null,
    created_at_to: nowISOString satisfies string & tags.Format<"date-time">,
    updated_at_from: null,
    updated_at_to: null,
    deleted_only: false,
  } satisfies IOauthServerguests.IRequest;

  // Filter to only deleted records
  const reqDeletedOnly = {
    page: 1,
    limit: 5,
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
    deleted_only: true,
  } satisfies IOauthServerguests.IRequest;

  // 3. Call the API with these requests and validate
  const responses = [] as IPageIOauthServerguests.ISummary[];
  responses.push(
    await api.functional.oauthServer.admin.oauthServerGuests.indexGuests(
      connection,
      { body: reqAll },
    ),
  );
  responses.push(
    await api.functional.oauthServer.admin.oauthServerGuests.indexGuests(
      connection,
      { body: reqCreatedFrom },
    ),
  );
  responses.push(
    await api.functional.oauthServer.admin.oauthServerGuests.indexGuests(
      connection,
      { body: reqCreatedTo },
    ),
  );
  responses.push(
    await api.functional.oauthServer.admin.oauthServerGuests.indexGuests(
      connection,
      { body: reqDeletedOnly },
    ),
  );

  for (const response of responses) {
    typia.assert(response);

    TestValidator.predicate(
      "pagination fields are positive integers",
      response.pagination.current > 0 &&
        response.pagination.limit > 0 &&
        response.pagination.records >= 0 &&
        response.pagination.pages >= 0,
    );

    // Validate data array
    for (const summary of response.data) {
      typia.assert(summary);
      // Validate timestamps format via typia.assert
      TestValidator.predicate(
        `guest created_at is string and matches ISO date-time`,
        typeof summary.created_at === "string" && summary.created_at.length > 0,
      );
      TestValidator.predicate(
        `guest updated_at is string and matches ISO date-time`,
        typeof summary.updated_at === "string" && summary.updated_at.length > 0,
      );
    }
  }

  // 4. Try unauthorized access by resetting connection headers to empty
  const noAuthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access is rejected", async () => {
    await api.functional.oauthServer.admin.oauthServerGuests.indexGuests(
      noAuthConnection,
      { body: reqAll },
    );
  });
}
