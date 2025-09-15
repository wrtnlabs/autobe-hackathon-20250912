import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForum";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

/**
 * This test validates the guest user's ability to update a forum thread
 * within the Enterprise LMS system.
 *
 * Workflow:
 *
 * 1. Register a new guest user to obtain authentication tokens and user
 *    context.
 * 2. Confirm the existence of a forum in which to create and later update a
 *    thread.
 * 3. Create a new forum thread associated with the authenticated guest user.
 * 4. Update the created forum thread's title and body using the PATCH API.
 * 5. Verify the thread is updated correctly by examining the response.
 * 6. Assert error conditions for invalid authorization, non-existent IDs, and
 *    malformed input.
 *
 * Assertions ensure data integrity, permission enforcement, and proper
 * error handling.
 */
export async function test_api_guest_forum_thread_update_with_authorization(
  connection: api.IConnection,
) {
  // 1. Register a new guest user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const guestEmail = `${RandomGenerator.alphaNumeric(8)}@guest.example.com`;
  const createGuestBody = {
    tenant_id: tenantId,
    email: guestEmail,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  const guestUser: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: createGuestBody,
    });
  typia.assert(guestUser);
  TestValidator.equals(
    "guest user email matches input",
    guestUser.email,
    createGuestBody.email,
  );
  TestValidator.equals(
    "guest user tenant_id matches input",
    guestUser.tenant_id,
    createGuestBody.tenant_id,
  );

  // 2. Confirm forum existence
  const forumId = typia.random<string & tags.Format<"uuid">>();
  const forum: IEnterpriseLmsForum =
    await api.functional.enterpriseLms.forums.at(connection, {
      forumId,
    });
  typia.assert(forum);

  TestValidator.equals(
    "forum tenant_id matches guest tenant_id",
    forum.tenant_id,
    guestUser.tenant_id,
  );

  // 3. Create a forum thread
  const createThreadBody = {
    forum_id: forum.id,
    author_id: guestUser.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const createdThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.guest.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: createThreadBody,
      },
    );
  typia.assert(createdThread);

  TestValidator.equals(
    "created thread forum_id matches forum",
    createdThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "created thread author_id matches guest user",
    createdThread.author_id,
    guestUser.id,
  );
  TestValidator.equals(
    "created thread title matches input",
    createdThread.title,
    createThreadBody.title,
  );

  // 4. Update the forum thread
  const updateThreadBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEnterpriseLmsForumThread.IUpdate;

  const updatedThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.guest.forums.forumThreads.update(
      connection,
      {
        forumId: forum.id,
        forumThreadId: createdThread.id,
        body: updateThreadBody,
      },
    );
  typia.assert(updatedThread);

  TestValidator.equals(
    "updated thread forum_id remains unchanged",
    updatedThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "updated thread author_id remains unchanged",
    updatedThread.author_id,
    guestUser.id,
  );
  TestValidator.equals(
    "updated thread title matches update",
    updatedThread.title,
    updateThreadBody.title,
  );
  TestValidator.equals(
    "updated thread body matches update",
    updatedThread.body,
    updateThreadBody.body,
  );

  // 5. Negative test: invalid authorization
  // Note: SDK connection management limits simulation of user context changes for auth; this test assumes backend handles auth tokens internally.
  // Create another guest user to simulate unauthorized user
  const otherGuestEmail = `${RandomGenerator.alphaNumeric(8)}@guest.example.com`;
  const createOtherGuestBody = {
    tenant_id: tenantId,
    email: otherGuestEmail,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  const otherGuestUser: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: createOtherGuestBody,
    });
  typia.assert(otherGuestUser);

  await TestValidator.error(
    "update thread unauthorized should fail",
    async () => {
      await api.functional.enterpriseLms.guest.forums.forumThreads.update(
        connection,
        {
          forumId: forum.id,
          forumThreadId: createdThread.id,
          body: updateThreadBody,
        },
      );
    },
  );

  // 6. Negative test: update with non-existent forumId
  const nonExistentForumId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update thread with non-existent forumId should fail",
    async () => {
      await api.functional.enterpriseLms.guest.forums.forumThreads.update(
        connection,
        {
          forumId: nonExistentForumId,
          forumThreadId: createdThread.id,
          body: updateThreadBody,
        },
      );
    },
  );

  // 7. Negative test: update with non-existent forumThreadId
  const nonExistentForumThreadId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update thread with non-existent forumThreadId should fail",
    async () => {
      await api.functional.enterpriseLms.guest.forums.forumThreads.update(
        connection,
        {
          forumId: forum.id,
          forumThreadId: nonExistentForumThreadId,
          body: updateThreadBody,
        },
      );
    },
  );

  // 8. Negative test: update with empty body (no changes)
  const emptyUpdateBody = {} satisfies IEnterpriseLmsForumThread.IUpdate;
  await TestValidator.error(
    "update thread with empty body should fail",
    async () => {
      await api.functional.enterpriseLms.guest.forums.forumThreads.update(
        connection,
        {
          forumId: forum.id,
          forumThreadId: createdThread.id,
          body: emptyUpdateBody,
        },
      );
    },
  );
}
