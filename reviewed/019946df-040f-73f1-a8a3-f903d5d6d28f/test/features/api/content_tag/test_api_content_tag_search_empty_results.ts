import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentTag";

/**
 * Verify content tag search returns empty results for unmatched query.
 *
 * This test starts by creating and authenticating an organization admin
 * user, to obtain valid authorization context. It then performs a PATCH
 * content tag search with specific filters that are expected to match no
 * content tags.
 *
 * It validates the response structure is a paginated empty result:
 *
 * - The pagination object fields (current, limit, records, pages) are valid
 *   and indicate no data.
 * - The data array is empty, confirming no content tags were matched.
 *
 * This confirms the content tag search API correctly handles no-match
 * queries, respects pagination constraints, and returns an empty result set
 * cleanly, without errors or unexpected data.
 *
 * @param connection API connection
 */
export async function test_api_content_tag_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create organization admin user using a valid tenant and user data
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();

  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password: "Password123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const joined = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);

  // Step 2: Authenticate organization admin user with the registered email and password
  const loginBody = {
    email: email,
    password: "Password123!",
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedIn = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedIn);

  // Step 3: Perform a content tag search with filters that yield no matching tags
  const emptySearchBody = {
    search: "averyunlikelysearchtermthatmatchesnothing",
    code: "nonexistentcode",
    name: null,
    description: null,
    page: 1,
    limit: 10,
    order_by: "code",
    order_direction: "asc",
  } satisfies IEnterpriseLmsContentTag.IRequest;

  const response =
    await api.functional.enterpriseLms.organizationAdmin.contentTags.indexContentTag(
      connection,
      {
        body: emptySearchBody,
      },
    );
  typia.assert(response);

  // Step 4: Validate pagination info indicates empty result
  const pagination = response.pagination;
  TestValidator.equals("pagination: current page is 1", pagination.current, 1);
  TestValidator.equals("pagination: limit is 10", pagination.limit, 10);
  TestValidator.equals("pagination: records is 0", pagination.records, 0);
  TestValidator.equals("pagination: pages is 0", pagination.pages, 0);

  // Step 5: Validate data array is empty
  TestValidator.equals("data array is empty", response.data.length, 0);
}
