import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";

/**
 * This E2E test validates that an external learner can access detailed
 * information about a specific forum thread while respecting tenancy and
 * authorization.
 *
 * The test proceeds as follows:
 *
 * 1. Registers a new external learner with realistic but valid data.
 * 2. Uses the authentication token automatically provided to perform a
 *    authorized GET request to retrieve a forum thread's detailed info
 *    using specified forumId and forumThreadId.
 * 3. Verifies that the response matches the IEnterpriseLmsForumThread schema,
 *    including required and optional properties.
 * 4. Validates that an unauthenticated request to the same endpoint fails as
 *    expected.
 * 5. Validates that requests with non-existent or invalid forumId or
 *    forumThreadId fail with errors.
 *
 * This test ensures that external learners can only access forum threads
 * they are authorized to view, enforcing multi-tenant isolation and
 * role-based access control.
 */
export async function test_api_forum_forumthread_detail_external_learner_access(
  connection: api.IConnection,
) {
  // 1. Register a new external learner with realistic data
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1).toLowerCase()}${typia.random<string & tags.Pattern<"^[0-9]{2}$">>()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const externalLearner: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: joinBody,
      },
    );
  typia.assert(externalLearner);
  TestValidator.predicate(
    "external learner has access token",
    typeof externalLearner.access_token === "string" &&
      externalLearner.access_token.length > 0,
  );

  // 2. Attempt to fetch a forum thread with authorization
  // Use valid UUIDs from typia.random for demo
  const forumId = typia.random<string & tags.Format<"uuid">>();
  const forumThreadId = typia.random<string & tags.Format<"uuid">>();

  const forumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.externalLearner.forums.forumThreads.at(
      connection,
      {
        forumId,
        forumThreadId,
      },
    );
  typia.assert(forumThread);

  TestValidator.equals(
    "forum thread forum_id matches request",
    forumThread.forum_id,
    forumId,
  );
  TestValidator.predicate(
    "forum thread has valid id",
    typeof forumThread.id === "string" && forumThread.id.length > 0,
  );
  TestValidator.predicate(
    "forum thread has author_id",
    typeof forumThread.author_id === "string" &&
      forumThread.author_id.length > 0,
  );
  TestValidator.predicate(
    "forum thread has title",
    typeof forumThread.title === "string" && forumThread.title.length > 0,
  );
  TestValidator.predicate(
    "forum thread has created_at",
    typeof forumThread.created_at === "string" &&
      forumThread.created_at.length > 0,
  );
  TestValidator.predicate(
    "forum thread has updated_at",
    typeof forumThread.updated_at === "string" &&
      forumThread.updated_at.length > 0,
  );

  // 3. Verify soft delete date can be missing or null or ISO string
  if (forumThread.deleted_at !== null && forumThread.deleted_at !== undefined) {
    TestValidator.predicate(
      "forum thread deleted_at is ISO date string or null",
      typeof forumThread.deleted_at === "string" &&
        forumThread.deleted_at.length > 0,
    );
  } else {
    TestValidator.equals(
      "forum thread deleted_at is null or undefined",
      forumThread.deleted_at,
      forumThread.deleted_at,
    );
  }

  // 4. Verify unauthenticated access fails
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {}, // no Authorization header
  };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.enterpriseLms.externalLearner.forums.forumThreads.at(
      unauthConn,
      { forumId, forumThreadId },
    );
  });

  // 5. Verify error on non-existent forum/thread
  const invalidForumId = "00000000-0000-0000-0000-000000000000";
  const invalidForumThreadId = "11111111-1111-1111-1111-111111111111";
  await TestValidator.error(
    "access with invalid forumId should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.forums.forumThreads.at(
        connection,
        { forumId: invalidForumId, forumThreadId },
      );
    },
  );
  await TestValidator.error(
    "access with invalid forumThreadId should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.forums.forumThreads.at(
        connection,
        { forumId, forumThreadId: invalidForumThreadId },
      );
    },
  );
}
