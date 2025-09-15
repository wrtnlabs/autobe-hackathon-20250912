import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerDeveloper";

/**
 * This test scenario covers searching and retrieving a paginated list of
 * OAuth server developers.
 *
 * The scenario authenticates as an admin user and tests the PATCH
 * /oauthServer/admin/oauthServerDevelopers endpoint for filtering,
 * pagination, sorting, and authorization enforcement.
 *
 * It validates correct pagination metadata, filters developer emails
 * matching search criteria, checks ascending and descending sorting by
 * email (case-insensitive), and ensures unauthorized access is prohibited.
 *
 * Error handling for invalid pagination parameters is also tested.
 */
export async function test_api_oauth_server_developers_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins to obtain authentication token
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: "ChangeMe123!",
  } satisfies IOauthServerAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Note: It is assumed that developer user records already exist in the system for searching.

  // 2. Prepare search parameters variations
  const page = 1;
  const limit = 5;
  const validSearchString = admin.email.split("@")[0]; // partial email for search
  const sortBy = "email";
  const sortOrderAsc = "asc";
  const sortOrderDesc = "desc";

  // 3. Perform patch index call with valid search parameters
  const normalReq = {
    page,
    limit,
    search: validSearchString,
    sortBy,
    sortOrder: sortOrderAsc,
  } satisfies IOauthServerDeveloper.IRequest;

  const normalResponse =
    await api.functional.oauthServer.admin.oauthServerDevelopers.index(
      connection,
      { body: normalReq },
    );
  typia.assert(normalResponse);

  TestValidator.predicate(
    `page number should be ${page}`,
    normalResponse.pagination.current === page,
  );
  TestValidator.predicate(
    `limit should be ${limit}`,
    normalResponse.pagination.limit === limit,
  );
  TestValidator.predicate(
    "developer email includes search string",
    normalResponse.data.every((dev) => dev.email.includes(validSearchString)),
  );

  // 4. Test sort order ascending (case-insensitive)
  for (let i = 1; i < normalResponse.data.length; i++) {
    TestValidator.predicate(
      "developers sorted ascending by email (case-insensitive)",
      normalResponse.data[i - 1].email
        .toLowerCase()
        .localeCompare(normalResponse.data[i].email.toLowerCase()) <= 0,
    );
  }

  // 5. Test sort order descending (case-insensitive)
  const descReq = {
    ...normalReq,
    sortOrder: sortOrderDesc,
  } satisfies IOauthServerDeveloper.IRequest;
  const descResponse =
    await api.functional.oauthServer.admin.oauthServerDevelopers.index(
      connection,
      { body: descReq },
    );
  typia.assert(descResponse);
  for (let i = 1; i < descResponse.data.length; i++) {
    TestValidator.predicate(
      "developers sorted descending by email (case-insensitive)",
      descResponse.data[i - 1].email
        .toLowerCase()
        .localeCompare(descResponse.data[i].email.toLowerCase()) >= 0,
    );
  }

  // 6. Test pagination: check page increment and limit
  if (descResponse.pagination.pages > 1) {
    const page2Req = {
      ...normalReq,
      page: 2,
    } satisfies IOauthServerDeveloper.IRequest;
    const page2Response =
      await api.functional.oauthServer.admin.oauthServerDevelopers.index(
        connection,
        { body: page2Req },
      );
    typia.assert(page2Response);
    TestValidator.equals(
      "pagination page is 2",
      page2Response.pagination.current,
      2,
    );
    TestValidator.predicate(
      "data count should be <= limit",
      page2Response.data.length <= limit,
    );
  }

  // 7. Test error handling: invalid page number (-1)
  await TestValidator.error("invalid page number triggers error", async () => {
    await api.functional.oauthServer.admin.oauthServerDevelopers.index(
      connection,
      {
        body: {
          ...normalReq,
          page: -1,
        } satisfies IOauthServerDeveloper.IRequest,
      },
    );
  });

  // 8. Test authorization enforcement by trying unauthenticated request
  // Use a new connection with empty headers to simulate unauthorized client
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access is forbidden", async () => {
    await api.functional.oauthServer.admin.oauthServerDevelopers.index(
      unauthConn,
      { body: normalReq },
    );
  });
}
