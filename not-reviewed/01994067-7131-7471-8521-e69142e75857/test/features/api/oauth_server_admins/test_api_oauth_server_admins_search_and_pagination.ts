import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthServerAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerAdmins";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerOauthServerAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerOauthServerAdmins";

/*
 * Test OAuth Server Admins Search and Pagination
 *
 * This test covers the scenario of searching and paginating through OAuth server admin
 * users as an authenticated admin. It involves joining as a new admin to obtain
 * a valid token, using the token to perform filtered paginated search requests,
 * and validating the response's paging metadata, filtering behavior, and sorting.
 *
 * The test also verifies that unauthorized calls fail.
 */
export async function test_api_oauth_server_admins_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin Join and Authentication
  const adminCreate = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    email_verified: true,
    password: "A1b2C3d4!",
  } satisfies IOauthServerAdmin.ICreate;

  const adminToken = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(adminToken);

  // 2. Basic search with no filters (page 1, limit 10)
  const defaultSearchBody = {
    page: 1,
    limit: 10,
  } satisfies IOauthServerOauthServerAdmins.IRequest;

  const page1 = await api.functional.oauthServer.admin.oauthServerAdmins.index(
    connection,
    {
      body: defaultSearchBody,
    },
  );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    page1.pagination.limit === 10,
  );

  // 3. Test filtering by email_verified = true
  const filterVerifiedBody = {
    email_verified: true,
    page: 1,
    limit: 10,
  } satisfies IOauthServerOauthServerAdmins.IRequest;

  const verifiedPage =
    await api.functional.oauthServer.admin.oauthServerAdmins.index(connection, {
      body: filterVerifiedBody,
    });
  typia.assert(verifiedPage);

  // Validate all returned entries email_verified = true
  verifiedPage.data.forEach((admin) => {
    TestValidator.equals(
      "email_verified true filtering",
      admin.email_verified,
      true,
    );
  });

  // 4. Test sorting ascending by email
  // 'asc' or 'desc' expected in 'sort' property. Use 'asc' for ascending if it suits.
  const sortingAscBody = {
    sort: "asc",
    page: 1,
    limit: 10,
  } satisfies IOauthServerOauthServerAdmins.IRequest;

  const sortedAsc =
    await api.functional.oauthServer.admin.oauthServerAdmins.index(connection, {
      body: sortingAscBody,
    });
  typia.assert(sortedAsc);

  // Validate sorting order of emails ascending
  for (let i = 1; i < sortedAsc.data.length; i++) {
    TestValidator.predicate(
      `sorting ascending order check between ${i - 1} and ${i}`,
      sortedAsc.data[i - 1].email <= sortedAsc.data[i].email,
    );
  }

  // 5. Test sorting descending by email
  const sortingDescBody = {
    sort: "desc",
    page: 1,
    limit: 10,
  } satisfies IOauthServerOauthServerAdmins.IRequest;

  const sortedDesc =
    await api.functional.oauthServer.admin.oauthServerAdmins.index(connection, {
      body: sortingDescBody,
    });
  typia.assert(sortedDesc);

  // Validate sorting order of emails descending
  for (let i = 1; i < sortedDesc.data.length; i++) {
    TestValidator.predicate(
      `sorting descending order check between ${i - 1} and ${i}`,
      sortedDesc.data[i - 1].email >= sortedDesc.data[i].email,
    );
  }

  // 6. Test pagination - request page 2 with limit 5
  const page2Body = {
    page: 2,
    limit: 5,
  } satisfies IOauthServerOauthServerAdmins.IRequest;

  const page2 = await api.functional.oauthServer.admin.oauthServerAdmins.index(
    connection,
    {
      body: page2Body,
    },
  );
  typia.assert(page2);

  TestValidator.predicate(
    "page 2 current page number",
    page2.pagination.current === 2,
  );
  TestValidator.predicate("page 2 limit number", page2.pagination.limit === 5);

  // 7. Test invalid filter: email_verified set as string (not boolean) - SKIPPED because it violates type safety;
  // According to instructions, invalid type tests are NOT implemented

  // 8. Unauthorized access: Create unauthenticated connection and attempt access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.oauthServer.admin.oauthServerAdmins.index(
      unauthConnection,
      {
        body: defaultSearchBody,
      },
    );
  });
}
