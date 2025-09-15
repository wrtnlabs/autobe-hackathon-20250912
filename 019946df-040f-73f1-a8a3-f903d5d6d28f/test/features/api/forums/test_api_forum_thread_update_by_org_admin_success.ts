import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This test validates the use case where an organization administrator user
 * joins the system, creates a forum under their tenant, creates a forum thread
 * inside this forum, then updates the forum thread's title and body.
 *
 * It ensures that all steps require proper authorization, that the created
 * forum and thread belong to the user's tenant, and that unauthorized attempts
 * to update or invalid parameters result in errors.
 *
 * The complete flow includes authentication, resource creation, modification,
 * and validation of updated resource properties.
 */
export async function test_api_forum_thread_update_by_org_admin_success(
  connection: api.IConnection,
) {
  // === 1. Organization Admin User Creation and Authentication ===
  const organizationAdminPayload = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `admin+${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "StrongPassw0rd!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminPayload,
    });
  typia.assert(orgAdmin);

  // === 2. Create a new forum owned by this organization admin's tenant ===
  const forumCreateBody = {
    tenant_id: orgAdmin.tenant_id,
    owner_id: orgAdmin.id,
    name: `Forum - ${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 })}`,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IEnterpriseLmsForums.ICreate;

  const forum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      { body: forumCreateBody },
    );
  typia.assert(forum);
  TestValidator.equals(
    "forum tenant matches user tenant",
    forum.tenant_id,
    orgAdmin.tenant_id,
  );
  TestValidator.equals(
    "forum owner_id matches user id",
    forum.owner_id,
    orgAdmin.id,
  );

  // === 3. Create a forum thread inside the created forum authored by the org admin user ===
  const forumThreadCreateBody = {
    forum_id: forum.id,
    author_id: orgAdmin.id,
    title: `Thread Title - ${RandomGenerator.paragraph({ sentences: 3 })}`,
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const thread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: forumThreadCreateBody,
      },
    );
  typia.assert(thread);
  TestValidator.equals(
    "thread forum_id matches forum id",
    thread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "thread author_id matches orgAdmin id",
    thread.author_id,
    orgAdmin.id,
  );

  // === 4. Update the forum thread's title and body ===
  const updatedTitle = `Updated Title - ${RandomGenerator.paragraph({ sentences: 4, wordMin: 6, wordMax: 12 })}`;
  const updatedBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 5,
    wordMax: 12,
  });

  const threadUpdateBody = {
    title: updatedTitle,
    body: updatedBody,
  } satisfies IEnterpriseLmsForumThread.IUpdate;

  const updatedThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.update(
      connection,
      {
        forumId: forum.id,
        forumThreadId: thread.id,
        body: threadUpdateBody,
      },
    );
  typia.assert(updatedThread);

  TestValidator.equals(
    "updated thread title match",
    updatedThread.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated thread body match",
    updatedThread.body,
    updatedBody,
  );
  TestValidator.equals(
    "updated forum_id unchanged",
    updatedThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "updated author_id unchanged",
    updatedThread.author_id,
    orgAdmin.id,
  );

  // === 5. Verify error responses for unauthorized update attempt ===
  // Attempt update with a non-authenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized update should be rejected",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.update(
        unauthenticatedConnection,
        { forumId: forum.id, forumThreadId: thread.id, body: threadUpdateBody },
      );
    },
  );

  // === 6. Verify error responses for invalid forum or thread IDs ===

  await TestValidator.error(
    "update with non-existent forum ID fails",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.update(
        connection,
        {
          forumId: typia.random<string & tags.Format<"uuid">>(),
          forumThreadId: thread.id,
          body: threadUpdateBody,
        },
      );
    },
  );

  await TestValidator.error(
    "update with non-existent thread ID fails",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.update(
        connection,
        {
          forumId: forum.id,
          forumThreadId: typia.random<string & tags.Format<"uuid">>(),
          body: threadUpdateBody,
        },
      );
    },
  );
}
