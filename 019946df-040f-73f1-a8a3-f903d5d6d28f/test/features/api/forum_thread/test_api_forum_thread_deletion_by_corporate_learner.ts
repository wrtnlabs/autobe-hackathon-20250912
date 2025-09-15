import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_forum_thread_deletion_by_corporate_learner(
  connection: api.IConnection,
) {
  // 1. OrganizationAdmin joins
  const orgAdminCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: RandomGenerator.name(1) + "@example.com",
    password: "securePass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdmin);

  // 2. OrganizationAdmin logs in
  const orgAdminLoginBody = {
    email: orgAdminCreateBody.email,
    password: orgAdminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const orgAdminLoggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: orgAdminLoginBody,
    });
  typia.assert(orgAdminLoggedIn);

  // 3. CorporateLearner joins
  const corporateLearnerCreateBody = {
    tenant_id: orgAdminCreateBody.tenant_id,
    email: RandomGenerator.name(1) + "@example.com",
    password: "learnerPass456!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: corporateLearnerCreateBody,
    });
  typia.assert(corporateLearner);

  // 4. CorporateLearner logs in
  const corporateLearnerLoginBody = {
    email: corporateLearnerCreateBody.email,
    password: corporateLearnerCreateBody.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const corporateLearnerLoggedIn: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: corporateLearnerLoginBody,
    });
  typia.assert(corporateLearnerLoggedIn);

  // 5. OrganizationAdmin creates a forum
  const forumCreateBody = {
    tenant_id: orgAdminCreateBody.tenant_id,
    owner_id: orgAdmin.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IEnterpriseLmsForums.ICreate;

  const forum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: forumCreateBody,
      },
    );
  typia.assert(forum);
  TestValidator.equals(
    "forum tenant ID matches org admin tenant ID",
    forum.tenant_id,
    orgAdminCreateBody.tenant_id,
  );

  // 6. CorporateLearner creates a forum thread in the forum
  const forumThreadCreateBody = {
    forum_id: forum.id,
    author_id: corporateLearner.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 15 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const forumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: forumThreadCreateBody,
      },
    );
  typia.assert(forumThread);
  TestValidator.equals(
    "forumThread forum ID matches forum ID",
    forumThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "forumThread author ID matches corporate learner ID",
    forumThread.author_id,
    corporateLearner.id,
  );

  // 7. CorporateLearner deletes the created forum thread
  await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.erase(
    connection,
    {
      forumId: forum.id,
      forumThreadId: forumThread.id,
    },
  );

  // No direct retrieval API available; deletion verified by absence of error and void response
}
