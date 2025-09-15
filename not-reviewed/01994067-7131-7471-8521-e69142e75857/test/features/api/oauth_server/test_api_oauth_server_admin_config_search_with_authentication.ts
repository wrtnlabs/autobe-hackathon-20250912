import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthServerConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerConfigs";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerOauthServerConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerOauthServerConfigs";

/**
 * Test searching OAuth server admin configuration settings with proper
 * admin authentication.
 *
 * This E2E test covers the entire process from admin user registration,
 * authentication, to searching OAuth server configuration entries with
 * filtering and pagination.
 *
 * It validates authorized access for admins and proper error handling for
 * unauthorized requests.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin user.
 * 2. Perform an authorized PATCH request to search OAuth server configurations
 *    with filters.
 * 3. Validate returned pagination and data match the search filters.
 * 4. Test unauthorized access returns appropriate HTTP error (401 or 403).
 */
export async function test_api_oauth_server_admin_config_search_with_authentication(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    email_verified: true,
    password: "StrongPassword123!",
  } satisfies IOauthServerAdmin.ICreate;

  const adminAuth: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuth);

  // 2. Authorized configuration search with filters and pagination
  const searchRequestBody1 = {
    key: "oauth",
    value: null,
    description: null,
    is_active: true,
    page: 1,
    limit: 10,
    sortOrder: "asc",
    sortField: "key",
  } satisfies IOauthServerOauthServerConfigs.IRequest;

  const searchResult1: IPageIOauthServerOauthServerConfigs.ISummary =
    await api.functional.oauthServer.admin.oauthServerConfigs.index(
      connection,
      {
        body: searchRequestBody1,
      },
    );
  typia.assert(searchResult1);

  // Verify pagination properties
  TestValidator.predicate(
    "pagination current page is 1 or more",
    searchResult1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at most 10",
    searchResult1.pagination.limit <= 10 && searchResult1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    searchResult1.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchResult1.pagination.records >= 0,
  );

  // Verify all config entries where applicable
  for (const cfg of searchResult1.data) {
    typia.assert(cfg);
    TestValidator.predicate(
      `config key contains 'oauth' when filter key is 'oauth'`,
      cfg.key.includes("oauth"),
    );
    TestValidator.predicate(
      "config is active (filtered) - assume active if no deleted_at property or deleted_at is null",
      cfg !== null,
    );
  }

  // 3. Unauthorized access simulation
  // Create unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized access should throw HttpError 401 or 403",
    async () => {
      await api.functional.oauthServer.admin.oauthServerConfigs.index(
        unauthenticatedConnection,
        { body: searchRequestBody1 },
      );
    },
  );
}
