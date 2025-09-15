import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumPost";

export async function test_api_forum_post_retrieval_detailed_view(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new corporate learner (join)
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1).replace(/ /g, "").toLowerCase()}@example.com`;
  const password = "P@ssword123";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const learnerCreateBody = {
    tenant_id: tenantId,
    email,
    password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const createdLearner = await api.functional.auth.corporateLearner.join(
    connection,
    {
      body: learnerCreateBody,
    },
  );
  typia.assert(createdLearner);

  // Step 2: Login the same corporate learner
  const learnerLoginBody = {
    email,
    password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loggedInLearner = await api.functional.auth.corporateLearner.login(
    connection,
    {
      body: learnerLoginBody,
    },
  );
  typia.assert(loggedInLearner);

  // Step 3: Attempt to retrieve a forum post by valid forumId, forumThreadId, forumPostId
  const forumId = typia.random<string & tags.Format<"uuid">>();
  const forumThreadId = typia.random<string & tags.Format<"uuid">>();
  const forumPostId = typia.random<string & tags.Format<"uuid">>();

  const post =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.at(
      connection,
      {
        forumId,
        forumThreadId,
        forumPostId,
      },
    );
  typia.assert(post);

  TestValidator.predicate(
    "post id is defined",
    typeof post.id === "string" && post.id.length > 0,
  );
  TestValidator.predicate(
    "post thread id is non-empty string",
    typeof post.thread_id === "string" && post.thread_id.length > 0,
  );
  TestValidator.predicate(
    "post author id is non-empty string",
    typeof post.author_id === "string" && post.author_id.length > 0,
  );
  TestValidator.predicate(
    "post body is non-empty string",
    typeof post.body === "string" && post.body.length > 0,
  );
  TestValidator.predicate(
    "post created_at is valid date-time string",
    typeof post.created_at === "string" && post.created_at.length > 0,
  );
  TestValidator.predicate(
    "post updated_at is valid date-time string",
    typeof post.updated_at === "string" && post.updated_at.length > 0,
  );
  TestValidator.predicate(
    "post is not deleted",
    post.deleted_at === null || post.deleted_at === undefined,
  );

  // Step 4: Verify unauthorized access is rejected
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated user cannot access forum post",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.at(
        unauthenticatedConn,
        {
          forumId,
          forumThreadId,
          forumPostId,
        },
      );
    },
  );
}
