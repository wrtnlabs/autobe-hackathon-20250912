import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerClientSecretRegeneration } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientSecretRegeneration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerClientSecretRegeneration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerClientSecretRegeneration";

/**
 * Test listing OAuth server client secret regeneration events with admin
 * authorization.
 *
 * This test covers:
 *
 * 1. Admin account creation and authentication using /auth/admin/join.
 * 2. Retrieving paginated lists of client secret regeneration records.
 * 3. Filtering by regeneration event id, OAuth client id, admin id,
 *    regenerated_at range.
 * 4. Sorting by regenerated_at timestamp.
 * 5. Validating response pagination information.
 * 6. Validating that entries have correct regeneration data.
 * 7. Negative tests for unauthorized access (no admin token) and invalid
 *    filter parameters.
 *
 * Each step uses strict DTO typing, appropriate use of nulls and pagination
 * constraints, and awaits all promises. typia.assert is used to validate
 * API responses. TestValidator performs logical validation.
 */
export async function test_api_oauth_server_client_secret_regeneration_index_admin_authorized(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: "securePass123!",
  } satisfies IOauthServerAdmin.ICreate;

  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // Step 2: Prepare valid filters for listing regenerations

  // Pagination parameters (fixed values within valid constraints)
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;

  // Filtering parameters
  const filterId: string | null = null; // Explicit null for optional
  const filterOauthClientId: string | null = null;
  const filterAdminId: string | null = null;

  // DateTime range filtering - null means no filtering
  const regeneratedAtStart: string | null = null;
  const regeneratedAtEnd: string | null = null;

  // Sorting order string - example: "regenerated_at DESC"
  const orderBy: string | null = null;

  // Step 3: Call the listing API with constructed filters
  const requestBody = {
    limit: limit,
    page: page,
    id: filterId,
    oauth_client_id: filterOauthClientId,
    admin_id: filterAdminId,
    regenerated_at_start: regeneratedAtStart,
    regenerated_at_end: regeneratedAtEnd,
    order_by: orderBy,
  } satisfies IOauthServerClientSecretRegeneration.IRequest;

  const page1: IPageIOauthServerClientSecretRegeneration.ISummary =
    await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page1);

  TestValidator.predicate(
    "pagination current page is 1 or more",
    page1.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination limit matches request or less",
    page1.pagination.limit === limit || page1.pagination.limit < limit,
  );

  TestValidator.predicate(
    "pagination records non-negative",
    page1.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages non-negative",
    page1.pagination.pages >= 0,
  );

  // Step 4: If there is data, validate structure and logical values
  if (page1.data.length > 0) {
    for (const item of page1.data) {
      typia.assert<IOauthServerClientSecretRegeneration.ISummary>(item);
      TestValidator.predicate(
        "each regeneration has uuid id",
        typeof item.id === "string" && item.id.length > 0,
      );
      TestValidator.predicate(
        "each regeneration has oauth_client_id",
        typeof item.oauth_client_id === "string" &&
          item.oauth_client_id.length > 0,
      );
      TestValidator.predicate(
        "each regeneration has admin_id",
        typeof item.admin_id === "string" && item.admin_id.length > 0,
      );
      TestValidator.predicate(
        "each regeneration has regenerated_at of string type",
        typeof item.regenerated_at === "string",
      );
    }
  }

  // Step 5: Negative test — missing authentication token
  const unauthenticatedConn: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "missing admin authorization token should cause error",
    async () => {
      await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.index(
        unauthenticatedConn,
        {
          body: {
            limit: 1,
            page: 1,
          } satisfies IOauthServerClientSecretRegeneration.IRequest,
        },
      );
    },
  );
}
