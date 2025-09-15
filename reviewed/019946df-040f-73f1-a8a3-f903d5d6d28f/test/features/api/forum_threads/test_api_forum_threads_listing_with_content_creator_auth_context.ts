import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsForumThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThreads";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsForumThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsForumThreads";

/**
 * This test ensures a contentCreatorInstructor user can retrieve a
 * paginated, filtered list of forum threads scoped to their tenant and a
 * specific forum.
 *
 * It covers user registrations, logins, forum creation, role switching,
 * tenant and forum ID contextual operations, and validation of paginated
 * forum threads retrieval.
 *
 * Steps:
 *
 * 1. Register contentCreatorInstructor user with tenant_id.
 * 2. Login contentCreatorInstructor user.
 * 3. Register organizationAdmin user with same tenant_id.
 * 4. Login organizationAdmin user.
 * 5. Create a forum under tenant and owned by organizationAdmin.
 * 6. Switch context back to contentCreatorInstructor.
 * 7. Fetch paginated forum threads list using PATCH endpoint.
 * 8. Validate returned forum threads belong to the correct forum and tenant,
 *    and the pagination information is correct.
 */
export async function test_api_forum_threads_listing_with_content_creator_auth_context(
  connection: api.IConnection,
) {
  // 1. Register a contentCreatorInstructor user
  const tenantId: string = typia.random<string & tags.Format<"uuid">>();
  const rawPassword: string = RandomGenerator.alphaNumeric(12);
  const contentCreatorUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenantId,
        email: `user${RandomGenerator.alphaNumeric(5)}@example.com`,
        password_hash: rawPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(contentCreatorUser);

  // 2. Login the contentCreatorInstructor user
  const contentCreatorLogin: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: {
        email: contentCreatorUser.email,
        password: rawPassword,
      } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
    });
  typia.assert(contentCreatorLogin);

  // 3. Register an organizationAdmin user with same tenant_id
  const adminRawPassword: string = RandomGenerator.alphaNumeric(12);
  const organizationAdminUser: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: `admin${RandomGenerator.alphaNumeric(5)}@example.com`,
        password: adminRawPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdminUser);

  // 4. Login the organizationAdmin user
  const organizationAdminLogin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: organizationAdminUser.email,
        password: adminRawPassword,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(organizationAdminLogin);

  // 5. Create a forum under tenant, owned by organizationAdmin
  const forum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: {
          tenant_id: tenantId,
          owner_id: organizationAdminUser.id,
          name: `Forum ${RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 })}`,
          description: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IEnterpriseLmsForums.ICreate,
      },
    );
  typia.assert(forum);

  // 6. Switch context back to contentCreatorInstructor user (re-login)
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: contentCreatorUser.email,
      password: rawPassword,
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 7. Fetch paginated forum threads list
  const requestBody = {
    page: 1,
    limit: 10,
    search: null,
    sort: "created_at DESC",
  } satisfies IEnterpriseLmsForumThreads.IRequest;

  const forumThreadsPage: IPageIEnterpriseLmsForumThreads.ISummary =
    await api.functional.enterpriseLms.contentCreatorInstructor.forums.forumThreads.index(
      connection,
      {
        forumId: forum.id satisfies string & tags.Format<"uuid">,
        body: requestBody,
      },
    );

  typia.assert(forumThreadsPage);

  // 8. Validate returned threads belong to specified forum and pagination is correct
  TestValidator.predicate(
    "All forum threads belong to the specified forum",
    forumThreadsPage.data.every((thread) => thread.forum_id === forum.id),
  );
  TestValidator.predicate(
    "All forum threads author IDs are non-empty",
    forumThreadsPage.data.every(
      (thread) =>
        typeof thread.author_id === "string" && thread.author_id.length > 0,
    ),
  );
  TestValidator.equals(
    "Pagination current page matches request",
    forumThreadsPage.pagination.current,
    requestBody.page ?? 1,
  );
  TestValidator.predicate(
    "Pagination limit matches request",
    forumThreadsPage.pagination.limit === (requestBody.limit ?? 10),
  );
  TestValidator.predicate(
    "Pagination page count is positive",
    forumThreadsPage.pagination.pages > 0,
  );
  TestValidator.predicate(
    "Total records are non-negative",
    forumThreadsPage.pagination.records >= 0,
  );
}
