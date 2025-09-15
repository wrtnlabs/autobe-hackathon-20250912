import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This test validates the retrieval of a forum thread by an authenticated
 * content creator/instructor user within a multi-tenant LMS environment.
 *
 * It covers the entire flow including user registration, authentication for
 * both contentCreatorInstructor and organizationAdmin roles, creation of a
 * tenant-scoped forum and a forum thread, followed by retrieval of the forum
 * thread by the contentCreatorInstructor user to ensure proper access control
 * and data integrity.
 *
 * The test also checks error handling using an invalid forum thread ID and
 * verifies that unauthorized access is rejected.
 *
 * Steps:
 *
 * 1. Register contentCreatorInstructor user with tenant ID, email, plaintext
 *    password, first and last names, and status.
 * 2. Register organizationAdmin user similarly, using the same tenant.
 * 3. Login as organizationAdmin and create a forum.
 * 4. Create a forum thread within that forum under the contentCreatorInstructor
 *    author ID.
 * 5. Authenticate as contentCreatorInstructor user.
 * 6. Retrieve the created forum thread and validate all key fields.
 * 7. Attempt retrieval with an invalid forumThreadId to confirm error is thrown.
 * 8. Attempt retrieval without authentication token to confirm authorization
 *    error.
 */
export async function test_api_content_creator_instructor_forum_thread_retrieval_with_authentication_and_invalid_id_handling(
  connection: api.IConnection,
) {
  // Define plain passwords to simulate real login
  const contentCreatorPassword = "TestPassword123!";
  const organizationAdminPassword = "AdminPassword123!";

  // 1. Content Creator/Instructor signs up
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const contentCreatorEmail = `cci_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const contentCreatorInstructorPayload = {
    tenant_id: tenantId,
    email: contentCreatorEmail,
    password_hash: contentCreatorPassword, // For test, use plain password here since join requires hash but no actual hashing needed
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const contentCreator =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorInstructorPayload,
    });
  typia.assert(contentCreator);

  // 2. Organization Admin signs up
  const organizationAdminEmail = `admin_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const organizationAdminPayload = {
    tenant_id: tenantId,
    email: organizationAdminEmail,
    password: organizationAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: organizationAdminPayload,
    },
  );
  typia.assert(organizationAdmin);

  // 3. Organization Admin logs in
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: organizationAdminEmail,
      password: organizationAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 4. Organization Admin creates forum
  const forumPayload = {
    tenant_id: tenantId,
    owner_id: organizationAdmin.id,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEnterpriseLmsForums.ICreate;

  const forum =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: forumPayload,
      },
    );
  typia.assert(forum);

  // 5. Organization Admin creates forum thread
  const forumThreadPayload = {
    forum_id: forum.id,
    author_id: contentCreator.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const forumThread =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: forumThreadPayload,
      },
    );
  typia.assert(forumThread);

  // 6. Content Creator/Instructor logs in
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: contentCreatorEmail,
      password: contentCreatorPassword,
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 7. Retrieve forum thread
  const retrievedThread =
    await api.functional.enterpriseLms.contentCreatorInstructor.forums.forumThreads.at(
      connection,
      {
        forumId: forum.id,
        forumThreadId: forumThread.id,
      },
    );
  typia.assert(retrievedThread);

  TestValidator.equals("forum thread id", retrievedThread.id, forumThread.id);
  TestValidator.equals(
    "forum thread forumId",
    retrievedThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "forum thread authorId",
    retrievedThread.author_id,
    contentCreator.id,
  );
  TestValidator.equals(
    "forum thread title",
    retrievedThread.title,
    forumThread.title,
  );

  // 8. Try invalid forumThreadId
  await TestValidator.error("invalid forumThreadId retrieval", async () => {
    await api.functional.enterpriseLms.contentCreatorInstructor.forums.forumThreads.at(
      connection,
      {
        forumId: forum.id,
        forumThreadId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 9. Unauthenticated connection tries to retrieve - expect error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.enterpriseLms.contentCreatorInstructor.forums.forumThreads.at(
      unauthenticatedConnection,
      {
        forumId: forum.id,
        forumThreadId: forumThread.id,
      },
    );
  });
}
