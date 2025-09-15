import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentVersion";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentVersion";

/**
 * This test scenario validates the search and retrieval of content version
 * snapshots for a given contentId by an authenticated organization
 * administrator.
 *
 * The process includes:
 *
 * 1. Organization admin user creation and authentication.
 * 2. Organization admin user login.
 * 3. Performing a content version pagination query filtered by the given
 *    contentId.
 *
 * The test asserts that the returned paginated results properly correspond
 * to the contentId, and pagination metadata is valid and consistent. It
 * verifies that data belongs only to the specified contentId ensuring
 * proper tenant and content scoping.
 */
export async function test_api_content_version_search_by_content_id(
  connection: api.IConnection,
) {
  // 1. Organization admin join
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Password123!";

  const joinPayload = {
    tenant_id: tenantId,
    email: adminEmail,
    password: adminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorizedAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: joinPayload,
    },
  );
  typia.assert(authorizedAdmin);

  // 2. Organization admin login
  const loginPayload = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedInAdmin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: loginPayload,
    },
  );
  typia.assert(loggedInAdmin);

  // 3. Generate or assume a valid contentId for this tenant
  // Since content creation API is not provided, simulate valid contentId usage
  const contentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Search content versions by contentId with pagination
  const searchRequest = {
    search: null,
    page: 1,
    limit: 10,
    sort: null,
  } satisfies IEnterpriseLmsContentVersion.IRequest;

  const pageSummary =
    await api.functional.enterpriseLms.organizationAdmin.contents.contentVersions.index(
      connection,
      {
        contentId,
        body: searchRequest,
      },
    );
  typia.assert(pageSummary);

  // 5. Validate pagination data
  TestValidator.predicate(
    "pagination current page is non-negative integer",
    Number.isInteger(pageSummary.pagination.current) &&
      pageSummary.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is positive integer",
    Number.isInteger(pageSummary.pagination.limit) &&
      pageSummary.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records is non-negative integer",
    Number.isInteger(pageSummary.pagination.records) &&
      pageSummary.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages is non-negative integer",
    Number.isInteger(pageSummary.pagination.pages) &&
      pageSummary.pagination.pages >= 0,
  );

  // 6. Validate each content version belongs to requested contentId
  for (const version of pageSummary.data) {
    TestValidator.equals(
      "content version contentId matches",
      version.content_id,
      contentId,
    );
  }
}
