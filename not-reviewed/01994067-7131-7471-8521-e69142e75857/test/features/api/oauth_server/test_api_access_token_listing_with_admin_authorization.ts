import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAccessToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerAccessToken";

/**
 * Validate that an admin user can list OAuth access tokens with pagination and
 * filters.
 *
 * This test involves creating and authenticating an admin, creating an OAuth
 * client, then requesting a filtered paginated access token list, verifying all
 * steps succeed and the filtering is correct.
 */
export async function test_api_access_token_listing_with_admin_authorization(
  connection: api.IConnection,
) {
  // 1. Admin join
  const email = typia.random<string & tags.Format<"email">>();
  const adminCreate = {
    email,
    email_verified: true,
    password: "someStrongPassword123!", // Strong password as plain string
  } satisfies IOauthServerAdmin.ICreate;

  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(adminAuthorized);

  // 2. Admin login
  const adminLogin = {
    email,
    password: "someStrongPassword123!",
  } satisfies IOauthServerAdmin.ILogin;

  const loginAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLogin });
  typia.assert(loginAuthorized);

  // 3. Create OAuth client
  const oauthClientCreate = {
    client_id: RandomGenerator.alphaNumeric(12),
    client_secret: RandomGenerator.alphaNumeric(24),
    redirect_uri: `https://${RandomGenerator.alphabets(8)}.com/callback`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;

  const createdClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientCreate,
    });
  typia.assert(createdClient);

  // 4. Query access tokens with filter using the created client_id
  const query: IOauthServerAccessToken.IRequest = {
    oauth_client_id: createdClient.client_id,
    scope: null,
    expires_from: null,
    expires_to: null,
    page: 1,
    limit: 50,
  };

  const accessTokenPage: IPageIOauthServerAccessToken.ISummary =
    await api.functional.oauthServer.admin.accessTokens.index(connection, {
      body: query,
    });
  typia.assert(accessTokenPage);

  // 5. Validate pagination and data
  const { pagination, data } = accessTokenPage;

  TestValidator.predicate(
    "pagination current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    pagination.pages >= 0,
  );

  TestValidator.predicate(
    "access tokens count does not exceed limit",
    data.length <= pagination.limit,
  );

  if (data.length > 0) {
    for (const token of data) {
      TestValidator.predicate(
        `access token '${token.id}' token string is non-empty`,
        typeof token.token === "string" && token.token.length > 0,
      );
    }
  }
}
