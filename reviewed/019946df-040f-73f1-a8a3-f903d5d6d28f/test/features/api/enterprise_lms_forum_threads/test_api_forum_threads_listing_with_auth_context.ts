import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForumThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThreads";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsForumThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsForumThreads";

export async function test_api_forum_threads_listing_with_auth_context(
  connection: api.IConnection,
) {
  // 1. Organization admin user registration with tenant ID and user info
  const tenant_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminCreate: IEnterpriseLmsOrganizationAdmin.ICreate = {
    tenant_id,
    email: adminEmail,
    password: "Str0ngP@ssword!",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
  };

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreate,
    });
  typia.assert(organizationAdmin);

  // 2. Organization admin user login
  const loginBody: IEnterpriseLmsOrganizationAdmin.ILogin = {
    email: adminEmail,
    password: adminCreate.password,
  };
  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Forum creation owned by the logged-in admin user and tenant
  const forumCreate: IEnterpriseLmsForums.ICreate = {
    tenant_id: organizationAdmin.tenant_id,
    owner_id: organizationAdmin.id,
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  };
  const forum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: forumCreate,
      },
    );
  typia.assert(forum);

  TestValidator.equals(
    "forum tenant_id equals admin tenant_id",
    forum.tenant_id,
    organizationAdmin.tenant_id,
  );
  TestValidator.equals(
    "forum owner_id equals admin id",
    forum.owner_id,
    organizationAdmin.id,
  );

  // 4. List forum threads for the created forum with pagination and filters
  // Prepare request body with valid pagination
  const forumThreadsRequest: IEnterpriseLmsForumThreads.IRequest = {
    page: 1,
    limit: 10,
    search: null,
    sort: "created_at DESC",
  };

  // Fetch paginated forum threads
  const forumThreadsPage: IPageIEnterpriseLmsForumThreads.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.index(
      connection,
      {
        forumId: forum.id,
        body: forumThreadsRequest,
      },
    );

  typia.assert(forumThreadsPage);

  // Check pagination properties
  TestValidator.predicate(
    "page.current should be positive integer",
    forumThreadsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "page.limit should be positive integer",
    forumThreadsPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "page.records is non-negative",
    forumThreadsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page.pages is non-negative",
    forumThreadsPage.pagination.pages >= 0,
  );

  // Verify each listed thread belongs to the requested forum
  for (const thread of forumThreadsPage.data) {
    TestValidator.equals(
      `thread ${thread.id} forum_id should be forum.id`,
      thread.forum_id,
      forum.id,
    );
  }

  // 5. Negative test: unauthorized access - create connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.index(
      unauthenticatedConnection,
      {
        forumId: forum.id,
        body: forumThreadsRequest,
      },
    );
  });

  // 6. Negative test: invalid forum ID format
  await TestValidator.error("invalid forumId format should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.index(
      connection,
      {
        forumId: "invalid-uuid-format-string" as string & tags.Format<"uuid">,
        body: forumThreadsRequest,
      },
    );
  });

  // 7. Negative test: malformed pagination parameters (e.g., zero or negative page/limit)
  const invalidPaginationVariants: Array<
    Partial<IEnterpriseLmsForumThreads.IRequest>
  > = [{ page: 0 }, { page: -1 }, { limit: 0 }, { limit: -1 }];
  for (const invalidParam of invalidPaginationVariants) {
    const invalidRequest = {
      ...forumThreadsRequest,
      ...invalidParam,
    } satisfies IEnterpriseLmsForumThreads.IRequest;

    await TestValidator.error(
      `invalid pagination parameter ${JSON.stringify(invalidParam)}`,
      async () => {
        await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.index(
          connection,
          {
            forumId: forum.id,
            body: invalidRequest,
          },
        );
      },
    );
  }
}
