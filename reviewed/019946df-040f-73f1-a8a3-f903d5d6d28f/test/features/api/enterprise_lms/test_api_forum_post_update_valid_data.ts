import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumPost";

export async function test_api_forum_post_update_valid_data(
  connection: api.IConnection,
) {
  // 1. Corporate learner joins
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`;
  const password = "Password123!";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const corpLearnerCreateBody = {
    tenant_id: tenantId,
    email,
    password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const corpLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: corpLearnerCreateBody,
    });
  typia.assert(corpLearner);

  // 2. Corporate learner logs in
  const corpLearnerLoginBody = {
    email,
    password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;
  const loginResult: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: corpLearnerLoginBody,
    });
  typia.assert(loginResult);

  // 3. Setup realistic UUIDs for forum post identification
  const forumId = typia.random<string & tags.Format<"uuid">>();
  const forumThreadId = typia.random<string & tags.Format<"uuid">>();
  const forumPostId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare forum post update body
  const updateBody = {
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 7,
    }),
  } satisfies IEnterpriseLmsForumPost.IUpdate;

  // 5. Perform forum post update API call
  const updatedPost: IEnterpriseLmsForumPost =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.update(
      connection,
      {
        forumId,
        forumThreadId,
        forumPostId,
        body: updateBody,
      },
    );

  typia.assert(updatedPost);

  // 6. Verify updated content
  TestValidator.equals(
    "post body should be updated",
    updatedPost.body,
    updateBody.body!,
  );
}
