import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

/**
 * This test verifies the guest user's ability to access detailed information of
 * a forum thread within a specific forum in the Enterprise LMS platform. It
 * first registers a new guest user via the POST /auth/guest/join API to obtain
 * guest user credentials and authentication tokens. Then, it uses valid forum
 * and forum thread UUIDs to retrieve forum thread details through GET
 * /enterpriseLms/guest/forums/{forumId}/forumThreads/{forumThreadId}. The test
 * asserts the structure, correctness, and integrity of the retrieved forum
 * thread object, ensuring it contains required properties like id, forum_id,
 * author_id, title, timestamps, and correctly handled optional fields. The test
 * also covers error and unauthorized access state scenarios if applicable by
 * handling relevant validation. This ensures the guest user role respects
 * tenant data boundaries and permissions when accessing forum thread data.
 */
export async function test_api_forum_forumthread_detail_guest_access(
  connection: api.IConnection,
) {
  // 1. Register a new guest user
  const guestCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  const guest: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestCreateBody,
    });
  typia.assert(guest);

  // 2. Generate random UUIDs for forumId and forumThreadId
  const forumId = typia.random<string & tags.Format<"uuid">>();
  const forumThreadId = typia.random<string & tags.Format<"uuid">>();

  // 3. Fetch the forum thread details
  const forumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.guest.forums.forumThreads.at(
      connection,
      {
        forumId,
        forumThreadId,
      },
    );
  typia.assert(forumThread);

  // 4. Validate forum thread properties
  TestValidator.predicate(
    "forumThread.id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      forumThread.id,
    ),
  );
  TestValidator.equals(
    "forumThread thread forumId matches",
    forumThread.forum_id,
    forumId,
  );
  TestValidator.predicate(
    "forumThread.author_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      forumThread.author_id,
    ),
  );
  TestValidator.predicate(
    "forumThread.title is non-empty",
    forumThread.title.length > 0,
  );

  TestValidator.predicate(
    "forumThread.created_at is ISO 8601",
    !isNaN(Date.parse(forumThread.created_at)),
  );
  TestValidator.predicate(
    "forumThread.updated_at is ISO 8601",
    !isNaN(Date.parse(forumThread.updated_at)),
  );

  // 5. Optional fields can be null or string
  TestValidator.predicate(
    "forumThread.body is string or null or undefined",
    forumThread.body === null ||
      typeof forumThread.body === "string" ||
      forumThread.body === undefined,
  );
  TestValidator.predicate(
    "forumThread.deleted_at is null, string or undefined",
    forumThread.deleted_at === null ||
      typeof forumThread.deleted_at === "string" ||
      forumThread.deleted_at === undefined,
  );
}
