import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate the complete forum thread detail retrieval workflow for a
 * corporate learner.
 *
 * This test covers user registrations with role-based authentication, forum
 * and forum thread creation, then retrieval as a corporate learner,
 * validating all returned properties for correctness. It verifies that only
 * authorized users can access forum thread details within their tenant. It
 * also validates error responses for unauthorized access and not found
 * cases.
 *
 * Workflow:
 *
 * 1. Register and login corporate learner user.
 * 2. Register and login organization admin user.
 * 3. Organization admin creates a forum.
 * 4. Organization admin creates a forum thread.
 * 5. Corporate learner retrieves forum thread details and validates.
 * 6. Corporate learner attempts unauthorized access without token; expects
 *    failure.
 * 7. Corporate learner attempts retrieving a non-existing forum thread;
 *    expects 404.
 */
export async function test_api_corporate_learner_forum_thread_detail_retrieval_with_authentication_and_error_cases(
  connection: api.IConnection,
) {
  // 1. Register and authenticate corporate learner user
  const corporateLearnerPayload = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `learner_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const corporateLearnerAuth = await api.functional.auth.corporateLearner.join(
    connection,
    { body: corporateLearnerPayload },
  );
  typia.assert(corporateLearnerAuth);

  // 2. Register and authenticate organization admin user with the SAME tenant_id
  const organizationAdminPayload = {
    tenant_id: corporateLearnerPayload.tenant_id,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdminAuth =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminPayload,
    });
  typia.assert(organizationAdminAuth);

  // 3. Organization admin creates a forum
  const forumCreatePayload = {
    tenant_id: organizationAdminPayload.tenant_id,
    owner_id: organizationAdminAuth.id,
    name: `Forum_${RandomGenerator.alphaNumeric(6)}`,
    description: `Test forum for corporate learner retrieval ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies IEnterpriseLmsForums.ICreate;

  const forum =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      { body: forumCreatePayload },
    );
  typia.assert(forum);

  // 4. Organization admin creates a forum thread in the forum
  const forumThreadCreatePayload = {
    forum_id: forum.id,
    author_id: organizationAdminAuth.id,
    title: `Thread Title ${RandomGenerator.paragraph({ sentences: 2 })}`,
    body: `Thread body content: ${RandomGenerator.content({ paragraphs: 1 })}`,
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const forumThread =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.create(
      connection,
      { forumId: forum.id, body: forumThreadCreatePayload },
    );
  typia.assert(forumThread);

  // 5. Corporate learner retrieves the forum thread details
  const retrievedThread =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.at(
      connection,
      { forumId: forum.id, forumThreadId: forumThread.id },
    );
  typia.assert(retrievedThread);

  TestValidator.equals(
    "forum thread id matches",
    retrievedThread.id,
    forumThread.id,
  );
  TestValidator.equals(
    "forum thread forum_id matches",
    retrievedThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "forum thread author_id matches",
    retrievedThread.author_id,
    organizationAdminAuth.id,
  );
  TestValidator.equals(
    "forum thread title matches",
    retrievedThread.title,
    forumThreadCreatePayload.title,
  );
  TestValidator.equals(
    "forum thread body matches",
    retrievedThread.body ?? null,
    forumThreadCreatePayload.body ?? null,
  );

  TestValidator.predicate(
    "forum thread has creation timestamp",
    typeof retrievedThread.created_at === "string",
  );
  TestValidator.predicate(
    "forum thread has update timestamp",
    typeof retrievedThread.updated_at === "string",
  );

  // 6. Attempt retrieval without authentication - using unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized access without token should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.at(
        unauthenticatedConnection,
        { forumId: forum.id, forumThreadId: forumThread.id },
      );
    },
  );

  // 7. Attempt retrieval with invalid forumThreadId - expect 404 error
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval with invalid forumThreadId should fail (404)",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.at(
        connection,
        { forumId: forum.id, forumThreadId: invalidId },
      );
    },
  );
}
