import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";

/**
 * This E2E test verifies the full workflow where a content creator instructor
 * registers, logs in, and creates a forum thread within a specified forum.
 *
 * Business validations checked include proper tenant and author linkage,
 * successful response typing, and thread property accuracy.
 *
 * 1. Register a content creator instructor user with tenant ID.
 * 2. Login as that user to obtain authentication token.
 * 3. Create a forum thread in a random forum (using a UUID forumId).
 * 4. Verify the response contains expected properties with correct values.
 * 5. Skip negative test cases due to constraints, focusing on successful flow.
 */
export async function test_api_forum_thread_creation_content_creator_instructor(
  connection: api.IConnection,
) {
  // Step 1: Register Content Creator Instructor user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecretP@ssw0rd";

  // The password hash is expected hashed before sending - simulate hashed value here
  const passwordHash = `hashed_${password}`;

  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password_hash: passwordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const joined = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(joined);

  // Step 2: Login as the user
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const loggedIn = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedIn);

  // Step 3: Create a forum thread
  // For test purpose, generate a random forumId
  const forumId = typia.random<string & tags.Format<"uuid">>();

  const threadTitle = RandomGenerator.paragraph({ sentences: 3 });
  const threadBody = RandomGenerator.content({ paragraphs: 1 });

  const createBody = {
    forum_id: forumId,
    author_id: loggedIn.id,
    title: threadTitle,
    body: threadBody,
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const createdThread =
    await api.functional.enterpriseLms.contentCreatorInstructor.forums.forumThreads.create(
      connection,
      {
        forumId: forumId,
        body: createBody,
      },
    );
  typia.assert(createdThread);

  // Step 4: Validate created forum thread's properties
  TestValidator.equals(
    "forum thread forum_id matches",
    createdThread.forum_id,
    forumId,
  );
  TestValidator.equals(
    "forum thread author_id matches logged in user",
    createdThread.author_id,
    loggedIn.id,
  );
  TestValidator.equals(
    "forum thread title matches",
    createdThread.title,
    threadTitle,
  );

  // body is optional and nullable, so allow null or equal string
  if (createdThread.body === null || createdThread.body === undefined) {
    TestValidator.predicate("forum thread body is null or undefined", true);
  } else {
    TestValidator.equals(
      "forum thread body matches",
      createdThread.body,
      threadBody,
    );
  }

  // Validate timestamps presence and format compliance
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof createdThread.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(createdThread.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof createdThread.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(createdThread.updated_at),
  );
  // deleted_at may be null or missing
  if (
    createdThread.deleted_at !== null &&
    createdThread.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is ISO 8601 string if present",
      typeof createdThread.deleted_at === "string" &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(createdThread.deleted_at),
    );
  }
}
