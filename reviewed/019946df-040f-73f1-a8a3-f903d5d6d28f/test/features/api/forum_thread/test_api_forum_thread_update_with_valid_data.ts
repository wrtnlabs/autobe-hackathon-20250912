import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * E2E test function for updating a forum thread.
 *
 * This function tests the full business flow:
 *
 * 1. SystemAdmin user creation and authentication.
 * 2. Forum creation associated with the authenticated tenant and owner.
 * 3. Forum thread creation within the forum.
 * 4. Forum thread update with new title and body.
 *
 * It validates successful update via response assertions and typia checks.
 */
export async function test_api_forum_thread_update_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create and authenticate systemAdmin user
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  const tenantId = systemAdmin.tenant_id;
  const ownerId = systemAdmin.id;

  // 2. Create a forum for this tenant and owner
  const forumCreateBody = {
    tenant_id: tenantId,
    owner_id: ownerId,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEnterpriseLmsForums.ICreate;

  const forum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: forumCreateBody,
      },
    );
  typia.assert(forum);

  const forumId = forum.id;

  // 3. Create a forum thread in the forum
  const forumThreadCreateBody = {
    forum_id: forumId,
    author_id: ownerId,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const forumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.systemAdmin.forums.forumThreads.create(
      connection,
      {
        forumId: forumId,
        body: forumThreadCreateBody,
      },
    );
  typia.assert(forumThread);

  const forumThreadId = forumThread.id;

  // 4. Update the forum thread's title and body
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedBody = RandomGenerator.content({ paragraphs: 3 });

  const forumThreadUpdateBody = {
    title: updatedTitle,
    body: updatedBody,
  } satisfies IEnterpriseLmsForumThread.IUpdate;

  const updatedForumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.systemAdmin.forums.forumThreads.update(
      connection,
      {
        forumId: forumId,
        forumThreadId: forumThreadId,
        body: forumThreadUpdateBody,
      },
    );
  typia.assert(updatedForumThread);

  // Verify that the update was successful
  TestValidator.equals(
    "Updated forum thread title matches",
    updatedForumThread.title,
    updatedTitle,
  );
  TestValidator.equals(
    "Updated forum thread body matches",
    updatedForumThread.body,
    updatedBody,
  );

  // Verify forum_id and author_id consistency
  TestValidator.equals(
    "Updated forum thread forum_id remains unchanged",
    updatedForumThread.forum_id,
    forumId,
  );
  TestValidator.equals(
    "Updated forum thread author_id remains unchanged",
    updatedForumThread.author_id,
    ownerId,
  );
}
