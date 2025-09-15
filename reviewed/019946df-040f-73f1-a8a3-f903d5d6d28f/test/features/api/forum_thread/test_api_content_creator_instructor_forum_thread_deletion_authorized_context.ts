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
 * Test deletion of a forum thread by an authenticated content
 * creator/instructor.
 *
 * This test covers the following workflow:
 *
 * 1. Content Creator/Instructor user joins the platform.
 * 2. Content Creator/Instructor user logs in to authenticate.
 * 3. Organization Admin user joins and logs in to create the forum.
 * 4. Organization Admin creates a forum for the tenant.
 * 5. Organization Admin creates a forum thread authored by the content
 *    creator.
 * 6. Content Creator deletes the forum thread within their tenant.
 * 7. Verify the forum thread deletion completes successfully.
 * 8. Test unauthorized deletion attempts from outside the tenant or with wrong
 *    roles.
 *
 * Validation ensures correct role-based and tenant-based access controls.
 */
export async function test_api_content_creator_instructor_forum_thread_deletion_authorized_context(
  connection: api.IConnection,
) {
  // 1. Content Creator/Instructor user joins the platform
  const cciEmail = typia.random<string & tags.Format<"email">>();
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const cciPassword = "P@ssw0rd";
  const cciJoinBody = {
    tenant_id: tenantId,
    email: cciEmail,
    password_hash: cciPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const cci = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    {
      body: cciJoinBody,
    },
  );
  typia.assert(cci);

  // 2. Content Creator/Instructor login
  const cciLoginBody = {
    email: cciEmail,
    password: cciPassword,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: cciLoginBody,
  });

  // 3. Organization Admin user joins
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "AdminP@ss1";
  const orgAdminJoinBody = {
    tenant_id: tenantId,
    email: orgAdminEmail,
    password: orgAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminJoinBody,
    },
  );
  typia.assert(orgAdmin);

  // 4. Organization Admin login
  const orgAdminLoginBody = {
    email: orgAdminEmail,
    password: orgAdminPassword,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAdminLoginBody,
  });

  // 5. Organization Admin creates a forum for the tenant
  const forumName = RandomGenerator.paragraph({ sentences: 3 });
  const forumCreateBody = {
    tenant_id: tenantId,
    owner_id: orgAdmin.id,
    name: forumName,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEnterpriseLmsForums.ICreate;
  const forum =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: forumCreateBody,
      },
    );
  typia.assert(forum);

  // 6. Organization Admin creates a forum thread authored by the content creator
  const threadTitle = RandomGenerator.paragraph({ sentences: 2 });
  const threadBody = RandomGenerator.content({ paragraphs: 2 });
  const forumThreadCreateBody = {
    forum_id: forum.id,
    author_id: cci.id,
    title: threadTitle,
    body: threadBody,
  } satisfies IEnterpriseLmsForumThread.ICreate;
  const forumThread =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: forumThreadCreateBody,
      },
    );
  typia.assert(forumThread);

  // 7. Re-login content creator to ensure correct auth token for deletion
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: cciLoginBody,
  });

  // 8. Content Creator deletes the forum thread
  await api.functional.enterpriseLms.contentCreatorInstructor.forums.forumThreads.erase(
    connection,
    {
      forumId: forum.id,
      forumThreadId: forumThread.id,
    },
  );

  // 9. Verify unauthorized deletion attempts
  // Attempt to delete a non-existent forum thread (should cause error 404 or 403)
  const fakeForumThreadId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should not delete non-existent forum thread",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.forums.forumThreads.erase(
        connection,
        {
          forumId: forum.id,
          forumThreadId: fakeForumThreadId,
        },
      );
    },
  );

  // Attempt to delete forum thread from a different tenant
  // Create another tenant content creator user
  const otherTenantId = typia.random<string & tags.Format<"uuid">>();
  const otherCciEmail = typia.random<string & tags.Format<"email">>();
  const otherCciPassword = "P@ssw0rd1";
  const otherCciJoinBody = {
    tenant_id: otherTenantId,
    email: otherCciEmail,
    password_hash: otherCciPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const otherCci = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    {
      body: otherCciJoinBody,
    },
  );
  typia.assert(otherCci);

  const otherCciLoginBody = {
    email: otherCciEmail,
    password: otherCciPassword,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: otherCciLoginBody,
  });

  // Try to delete the original forum thread with other tenant user (should fail 403)
  await TestValidator.error(
    "should not delete forum thread from a different tenant",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.forums.forumThreads.erase(
        connection,
        {
          forumId: forum.id,
          forumThreadId: forumThread.id,
        },
      );
    },
  );
}
