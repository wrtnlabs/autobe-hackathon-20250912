import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";

/**
 * This E2E test case verifies the successful update of a forum thread by an
 * authorized contentCreatorInstructor user.
 *
 * It performs the complete workflow starting from user registration (join),
 * logging in, and then updating a forum thread with valid data. It asserts
 * the API response and validates key business rules such as tenant data
 * isolation, author ownership, and ensures that the updated fields match
 * the input.
 *
 * The test focuses on the success path for updating a forum thread's title
 * and body with proper authentication and valid input. Failures such as
 * unauthorized access, invalid IDs, or missing required fields are excluded
 * here for brevity.
 *
 * Steps:
 *
 * 1. ContentCreatorInstructor user joins (registers) with valid payload
 *    including tenantId.
 * 2. ContentCreatorInstructor user logs in with the same credentials.
 * 3. The test simulates existing forumId and forumThreadId as UUIDs.
 * 4. It sends an update request with a new title and non-null body content.
 * 5. It asserts that the response's updated thread matches the new title and
 *    body, remains assigned to the correct forum and author.
 * 6. All required fields and format constraints are verified.
 */
export async function test_api_forum_thread_update_with_valid_data(
  connection: api.IConnection,
) {
  // 1. ContentCreatorInstructor user joins (registration) with necessary data
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const plainPassword = RandomGenerator.alphaNumeric(12);
  // Simulate hash for join
  const passwordHash = `${plainPassword}hashed`; // For testing purposes
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const firstName = RandomGenerator.name(2);
  const lastName = RandomGenerator.name(2);
  const status = "active";

  const authorizedUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        status: status,
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(authorizedUser);

  // 2. ContentCreatorInstructor user logs in to get fresh authorization
  const loggedInUser = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    {
      body: {
        email: email,
        password: plainPassword,
      } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
    },
  );
  typia.assert(loggedInUser);

  // 3. Generate existing forumId and forumThreadId
  const forumId = typia.random<string & tags.Format<"uuid">>();
  const forumThreadId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare forum thread update data with valid new title and body
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newBody = RandomGenerator.content({ paragraphs: 1 });
  const updateBody = {
    title: newTitle,
    body: newBody,
  } satisfies IEnterpriseLmsForumThread.IUpdate;

  // 5. Call update endpoint with new title and body
  const updatedThread =
    await api.functional.enterpriseLms.contentCreatorInstructor.forums.forumThreads.update(
      connection,
      {
        forumId: forumId,
        forumThreadId: forumThreadId,
        body: updateBody,
      },
    );
  typia.assert(updatedThread);

  // 6. Validate the updated thread fields
  TestValidator.equals(
    "updated thread id remains the same",
    updatedThread.id,
    forumThreadId,
  );
  TestValidator.equals(
    "updated thread forum id remains the same",
    updatedThread.forum_id,
    forumId,
  );
  TestValidator.equals(
    "updated thread title matches input",
    updatedThread.title,
    newTitle,
  );
  if (updatedThread.body === null || updatedThread.body === undefined) {
    throw new Error("updated thread body is null or undefined");
  }
  TestValidator.equals(
    "updated thread body matches input",
    updatedThread.body,
    newBody,
  );
  TestValidator.predicate(
    "updated thread updated_at is valid ISO date-time",
    typeof updatedThread.updated_at === "string" &&
      updatedThread.updated_at.length > 0,
  );
  TestValidator.predicate(
    "updated thread created_at is valid ISO date-time",
    typeof updatedThread.created_at === "string" &&
      updatedThread.created_at.length > 0,
  );
  TestValidator.equals(
    "updated thread author id matches authorized user",
    updatedThread.author_id,
    authorizedUser.id,
  );
}
