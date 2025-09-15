import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsForumPost";

export async function test_api_corporate_learner_forum_post_index_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate corporate learner
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = RandomGenerator.alphaNumeric(6) + "@example.com";
  const plainPassword = "Password123!";

  // Join corporate learner
  const joined: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenantId,
        email,
        password: plainPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(joined);

  // Login corporate learner with same credentials
  const login: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: {
        email,
        password: plainPassword,
      } satisfies IEnterpriseLmsCorporateLearner.ILogin,
    });
  typia.assert(login);

  // 2. Prepare request to forum posts index endpoint
  const forumId = typia.random<string & tags.Format<"uuid">>();
  const forumThreadId = typia.random<string & tags.Format<"uuid">>();

  // Compose request body
  const requestBody: IEnterpriseLmsForumPost.IRequest = {
    page: 1,
    limit: 10,
    sort: "created_at desc",
  };

  // 3. Call forumPosts.index API
  const pageResult: IPageIEnterpriseLmsForumPost =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.index(
      connection,
      {
        forumId,
        forumThreadId,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pagination meta properties
  TestValidator.predicate(
    "pagination current page is at least 1",
    pageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    pageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    pageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    pageResult.pagination.records >= 0,
  );

  // 5. Validate posts array
  TestValidator.predicate(
    "posts data is an array",
    Array.isArray(pageResult.data),
  );

  // Since thread_id is optional filter, do not strictly require all posts thread_id equal forumThreadId
  // but if thread_id exists in a post, it should match forumThreadId
  for (const post of pageResult.data) {
    typia.assert(post);
    if (post.thread_id !== undefined && post.thread_id !== null) {
      TestValidator.equals(
        "post thread_id matches forumThreadId",
        post.thread_id,
        forumThreadId,
      );
    }
  }

  // 6. Additional boundary & error case tests:
  // - Invalid forumId (malformed uuid string)
  await TestValidator.error(
    "invalid forumId format rejects request",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.index(
        connection,
        {
          forumId: "invalid-uuid",
          forumThreadId,
          body: requestBody,
        },
      );
    },
  );

  // - Invalid forumThreadId (malformed uuid string)
  await TestValidator.error(
    "invalid forumThreadId format rejects request",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.index(
        connection,
        {
          forumId,
          forumThreadId: "invalid-uuid",
          body: requestBody,
        },
      );
    },
  );

  // - Unauthorized request (simulate by clearing Authorization header)
  // Generate unauthenticated connection by copying and clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access rejects request", async () => {
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.index(
      unauthConn,
      {
        forumId,
        forumThreadId,
        body: requestBody,
      },
    );
  });

  // - Empty results (simulate with page=1000, very large page, likely empty)
  const emptyPageRequestBody = {
    ...requestBody,
    page: 1000,
    limit: 10,
  } satisfies IEnterpriseLmsForumPost.IRequest;
  const emptyPageResult: IPageIEnterpriseLmsForumPost =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.index(
      connection,
      {
        forumId,
        forumThreadId,
        body: emptyPageRequestBody,
      },
    );
  typia.assert(emptyPageResult);
  TestValidator.equals(
    "empty page returns zero data length",
    emptyPageResult.data.length,
    0,
  );

  // - Large page size test (limit=100)
  const largeLimitRequestBody = {
    ...requestBody,
    page: 1,
    limit: 100,
  } satisfies IEnterpriseLmsForumPost.IRequest;
  const largeLimitResult: IPageIEnterpriseLmsForumPost =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.index(
      connection,
      {
        forumId,
        forumThreadId,
        body: largeLimitRequestBody,
      },
    );
  typia.assert(largeLimitResult);
  TestValidator.predicate(
    "large limit returns data array",
    Array.isArray(largeLimitResult.data),
  );
}
