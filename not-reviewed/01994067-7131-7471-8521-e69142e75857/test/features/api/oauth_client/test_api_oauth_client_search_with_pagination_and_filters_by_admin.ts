import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerOauthClient";

export async function test_api_oauth_client_search_with_pagination_and_filters_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user creation and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    email_verified: true,
    password: "AdminPass123!",
  } satisfies IOauthServerAdmin.ICreate;
  const adminAuth: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuth);

  // Step 2: Create multiple OAuth clients with varied attributes
  const oauthClientsToCreate = ArrayUtil.repeat(10, (index) => {
    const trusted = index % 2 === 0;
    const clientNumber = (index + 1).toString().padStart(3, "0");
    return {
      client_id: `client_${clientNumber}`,
      client_secret: `secret${clientNumber}`,
      redirect_uri: `https://redirect${clientNumber}.example.com/callback`,
      logo_uri:
        index % 3 === 0
          ? `https://logos.example.com/logo${clientNumber}.png`
          : null,
      is_trusted: trusted,
    } satisfies IOauthServerOauthClient.ICreate;
  });

  const createdClients: IOauthServerOauthClient[] = [];
  for (const clientBody of oauthClientsToCreate) {
    const created = await api.functional.oauthServer.admin.oauthClients.create(
      connection,
      {
        body: clientBody,
      },
    );
    typia.assert(created);
    createdClients.push(created);
  }

  // Step 3: Search with pagination and filters
  const searchBody1 = {
    page: 1,
    limit: 5,
    search: "client_00",
    is_trusted: true,
  } satisfies IOauthServerOauthClient.IRequest;

  const pageResult1 = await api.functional.oauthServer.admin.oauthClients.index(
    connection,
    {
      body: searchBody1,
    },
  );
  typia.assert(pageResult1);

  TestValidator.predicate(
    "pagination current page is 1",
    pageResult1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    pageResult1.pagination.limit === 5,
  );
  TestValidator.predicate(
    "data length is equal or less than limit",
    pageResult1.data.length <= 5,
  );
  for (const client of pageResult1.data) {
    TestValidator.predicate(
      "client_id contains search string",
      client.client_id.includes("client_00"),
    );
    TestValidator.equals("client is_trusted is true", client.is_trusted, true);
  }

  // Step 4: Search with different filters and pagination
  const searchBody2 = {
    page: 2,
    limit: 3,
    is_trusted: false,
  } satisfies IOauthServerOauthClient.IRequest;

  const pageResult2 = await api.functional.oauthServer.admin.oauthClients.index(
    connection,
    {
      body: searchBody2,
    },
  );
  typia.assert(pageResult2);

  TestValidator.predicate(
    "pagination current page is 2",
    pageResult2.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit is 3",
    pageResult2.pagination.limit === 3,
  );
  TestValidator.predicate(
    "data length is equal or less than limit",
    pageResult2.data.length <= 3,
  );
  for (const client of pageResult2.data) {
    TestValidator.equals(
      "client is_trusted is false",
      client.is_trusted,
      false,
    );
  }

  // Step 5: Attempt unauthorized access - simulate by using unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to index should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthClients.index(
        unauthConnection,
        {
          body: {} satisfies IOauthServerOauthClient.IRequest,
        },
      );
    },
  );
}
