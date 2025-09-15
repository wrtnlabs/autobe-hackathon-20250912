import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

/**
 * Test to ensure a guest user can successfully create a forum thread.
 *
 * The test performs the following steps:
 *
 * 1. Creates and authenticates a guest user via the auth guest join endpoint.
 * 2. Generates a valid, random UUID for the forumId since no forum creation
 *    API is available.
 * 3. Constructs a valid forum thread create request using the authenticated
 *    guest's id and the forumId.
 * 4. Calls the forum thread creation API and asserts the result with typia.
 * 5. Validates that the created thread data matches input data precisely.
 */
export async function test_api_guest_forum_thread_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate guest user
  const guest: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: `${RandomGenerator.name(1)}@example.com`,
        password_hash: RandomGenerator.alphaNumeric(16),
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsGuest.ICreate,
    });
  typia.assert(guest);

  // Step 2: Generate a dummy forumId (UUID format)
  const forumId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Prepare forum thread creation request body
  const requestBody = {
    forum_id: forumId,
    author_id: guest.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.paragraph({ sentences: 10, wordMin: 6, wordMax: 14 }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  // Step 4: Call the forum thread creation API
  const response: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.guest.forums.forumThreads.create(
      connection,
      {
        forumId,
        body: requestBody,
      },
    );
  typia.assert(response);

  // Step 5: Validate response fields
  TestValidator.equals(
    "forum_id matches",
    response.forum_id,
    requestBody.forum_id,
  );
  TestValidator.equals(
    "author_id matches",
    response.author_id,
    requestBody.author_id,
  );
  TestValidator.equals("title matches", response.title, requestBody.title);
  TestValidator.equals("body matches", response.body, requestBody.body ?? null);
}
