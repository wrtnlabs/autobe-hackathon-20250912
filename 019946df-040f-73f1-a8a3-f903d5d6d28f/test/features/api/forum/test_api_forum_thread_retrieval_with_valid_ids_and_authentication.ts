import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate detailed retrieval of a forum thread by valid forum and thread
 * IDs.
 *
 * This test covers the complete flow:
 *
 * 1. Authenticate as organizationAdmin user.
 * 2. Create a new forum in the authenticated tenant context.
 * 3. Create a new forum thread.
 * 4. Retrieve the forum thread by its exact ID.
 * 5. Validate the retrieved thread fields are correct and match created data.
 * 6. Test error when invalid forumThreadId is provided (expect HTTP 404).
 * 7. Test unauthorized access behavior (no authentication tokens).
 */
export async function test_api_forum_thread_retrieval_with_valid_ids_and_authentication(
  connection: api.IConnection,
) {
  // 1. Authenticate as organizationAdmin user via join
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: RandomGenerator.alphaNumeric(10) + "@example.com",
        password: "P@ssw0rd!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // 2. Create a forum within the authenticated tenant
  const forumCreateBody = {
    tenant_id: organizationAdmin.tenant_id,
    owner_id: organizationAdmin.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
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
  // Validate tenant and owner association
  TestValidator.equals(
    "forum tenant_id matches admin tenant_id",
    forum.tenant_id,
    organizationAdmin.tenant_id,
  );
  TestValidator.equals(
    "forum owner_id matches admin id",
    forum.owner_id,
    organizationAdmin.id,
  );

  // 3. Create a forum thread within the created forum
  const forumThreadCreateBody = {
    forum_id: forum.id,
    author_id: organizationAdmin.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const forumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: forumThreadCreateBody,
      },
    );
  typia.assert(forumThread);
  TestValidator.equals(
    "forumThread forum_id matches created forum id",
    forumThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "forumThread author_id matches admin id",
    forumThread.author_id,
    organizationAdmin.id,
  );

  // 4. Retrieve the created forum thread by its ID
  const retrievedThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.at(
      connection,
      {
        forumId: forum.id,
        forumThreadId: forumThread.id,
      },
    );
  typia.assert(retrievedThread);
  // Validate all key properties match creation
  TestValidator.equals(
    "retrievedThread id matches created id",
    retrievedThread.id,
    forumThread.id,
  );
  TestValidator.equals(
    "retrievedThread forum_id matches created forum_id",
    retrievedThread.forum_id,
    forumThread.forum_id,
  );
  TestValidator.equals(
    "retrievedThread author_id matches created author_id",
    retrievedThread.author_id,
    forumThread.author_id,
  );
  TestValidator.equals(
    "retrievedThread title matches created title",
    retrievedThread.title,
    forumThread.title,
  );
  TestValidator.equals(
    "retrievedThread body matches created body",
    retrievedThread.body ?? null,
    forumThread.body ?? null,
  );

  // 5. Test retrieval with invalid forumThreadId (expect error)
  await TestValidator.error(
    "error on retrieval with invalid forumThreadId",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.at(
        connection,
        {
          forumId: forum.id,
          forumThreadId: typia.random<string & tags.Format<"uuid">>(), // random nonexistent id
        },
      );
    },
  );

  // 6. Test unauthorized access - unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized error when retrieving without token",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.at(
        unauthConn,
        {
          forumId: forum.id,
          forumThreadId: forumThread.id,
        },
      );
    },
  );
}
