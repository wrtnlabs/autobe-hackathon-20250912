import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

export async function test_api_forum_thread_creation_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and obtain systemAdmin token
  const email = `admin.${RandomGenerator.alphaNumeric(5)}@company.com`;
  const passwordHash = RandomGenerator.alphaNumeric(20);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        status,
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // Step 2: Login with same credentials to set token
  const login: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email,
        password_hash: passwordHash,
      } satisfies IEnterpriseLmsSystemAdmin.ILogin,
    });
  typia.assert(login);

  // Step 3: Prepare valid forumId (use systemAdmin tenant_id as a dummy forumId)
  // Since there is no forum creation API provided, use tenant_id to simulate
  const forumId = systemAdmin.tenant_id;

  // Step 4: Prepare request body for creating a forum thread
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 7,
  });
  const bodyContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });

  const createBody: IEnterpriseLmsForumThread.ICreate = {
    forum_id: forumId,
    author_id: systemAdmin.id,
    title,
    body: bodyContent,
  };

  // Step 5: Create forum thread via systemAdmin API
  const forumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.systemAdmin.forums.forumThreads.create(
      connection,
      {
        forumId,
        body: createBody,
      },
    );
  typia.assert(forumThread);

  // Step 6: Basic assertions
  TestValidator.equals(
    "created forum thread forum_id matches",
    forumThread.forum_id,
    forumId,
  );
  TestValidator.equals(
    "created forum thread author_id matches",
    forumThread.author_id,
    systemAdmin.id,
  );
  TestValidator.equals(
    "created forum thread title matches",
    forumThread.title,
    title,
  );

  // timestamps should be valid ISO datetime string
  const createdAt = forumThread.created_at;
  const updatedAt = forumThread.updated_at;

  TestValidator.predicate(
    "created_at is ISO date",
    typeof createdAt === "string" && createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof updatedAt === "string" && updatedAt.length > 0,
  );

  // deleted_at should be null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    forumThread.deleted_at === null || forumThread.deleted_at === undefined,
  );

  // Step 7: Test error scenario - unauthorized access without authentication
  // To simulate unauthorized, use another connection without token
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized create forum thread should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.forums.forumThreads.create(
        unauthConnection,
        {
          forumId,
          body: createBody,
        },
      );
    },
  );
}
