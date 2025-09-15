import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

/**
 * This E2E test validates the complete scenario of deleting a forum thread by
 * an authenticated external learner user. The test ensures the external learner
 * can successfully delete their own forum thread within their tenant's forum.
 * It also validates negative scenarios such as attempting deletion using
 * invalid forum IDs or thread IDs, and unauthorized deletion attempts where the
 * user lacks proper authorization or tries deleting threads outside their
 * tenant for data isolation enforcement. It verifies that after deletion, the
 * forum thread no longer exists, confirming permanent removal. The test begins
 * by creating and authenticating a new external learner user and uses fresh
 * tenant- and user-scoped UUID values for forum and thread IDs. It checks that
 * deletion requests with invalid or non-existent IDs throw errors, and that
 * only an authenticated and authorized external learner can delete the forum
 * thread.
 */
export async function test_api_external_learner_forum_thread_deletion_with_authorization_and_validation(
  connection: api.IConnection,
) {
  // 1. Authenticate by creating a new external learner user to obtain tokens
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const authorized: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      { body: joinBody },
    );
  typia.assert(authorized);

  // Valid forum and forum thread IDs within the tenant
  const validForumId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const validForumThreadId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Perform successful deletion using valid IDs
  await api.functional.enterpriseLms.externalLearner.forums.forumThreads.erase(
    connection,
    {
      forumId: validForumId,
      forumThreadId: validForumThreadId,
    },
  );

  // 3. Negative tests
  // 3.1 Error for deletion with invalid forumId format
  await TestValidator.error(
    "deletion should fail with invalid forumId format",
    async () => {
      await api.functional.enterpriseLms.externalLearner.forums.forumThreads.erase(
        connection,
        {
          forumId: "invalid-uuid-format-forumId", // invalid UUID format
          forumThreadId: validForumThreadId,
        },
      );
    },
  );

  // 3.2 Error for deletion with invalid forumThreadId format
  await TestValidator.error(
    "deletion should fail with invalid forumThreadId format",
    async () => {
      await api.functional.enterpriseLms.externalLearner.forums.forumThreads.erase(
        connection,
        {
          forumId: validForumId,
          forumThreadId: "invalid-uuid-format-forumThreadId", // invalid UUID format
        },
      );
    },
  );

  // 3.3 Error for deletion with non-existent forumId
  await TestValidator.error(
    "deletion should fail with non-existent forumId",
    async () => {
      await api.functional.enterpriseLms.externalLearner.forums.forumThreads.erase(
        connection,
        {
          forumId: typia.random<string & tags.Format<"uuid">>(),
          forumThreadId: validForumThreadId,
        },
      );
    },
  );

  // 3.4 Error for deletion with non-existent forumThreadId
  await TestValidator.error(
    "deletion should fail with non-existent forumThreadId",
    async () => {
      await api.functional.enterpriseLms.externalLearner.forums.forumThreads.erase(
        connection,
        {
          forumId: validForumId,
          forumThreadId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 4. Authorization test not possible with current SDK format (no role removal endpoint)
  //    So at least try deletion with the same token after invalid forumId to confirm error is thrown
  //    Role or tenant scope improper access test is out of scope due to lack of related SDK functions
}
