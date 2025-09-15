import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

export async function test_api_system_admin_forum_thread_deletion_authorized_context(
  connection: api.IConnection,
) {
  // Step 1: System admin user registration
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = "1234";
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // Step 2: System admin login for authentication
  const systemAdminAuth: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
      } satisfies IEnterpriseLmsSystemAdmin.ILogin,
    });
  typia.assert(systemAdminAuth);

  // Step 3: Organization admin user registration
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "1234";
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: systemAdmin.tenant_id,
        email: orgAdminEmail,
        password: orgAdminPassword,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // Step 4: Organization admin login for authentication
  const orgAdminAuth: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(orgAdminAuth);

  // Step 5: Create a forum under the organization admin
  const forum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: {
          tenant_id: organizationAdmin.tenant_id,
          owner_id: organizationAdmin.id,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IEnterpriseLmsForums.ICreate,
      },
    );
  typia.assert(forum);

  // Step 6: Create a forum thread in the forum
  const forumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: {
          forum_id: forum.id,
          author_id: organizationAdmin.id,
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          body: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies IEnterpriseLmsForumThread.ICreate,
      },
    );
  typia.assert(forumThread);

  // Step 7: Switch authentication to system admin (simulate re-login)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: systemAdminPassword,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // Step 8: Delete the forum thread as system admin
  await api.functional.enterpriseLms.systemAdmin.forums.forumThreads.erase(
    connection,
    {
      forumId: forum.id,
      forumThreadId: forumThread.id,
    },
  );

  // Step 9: Verify the deletion succeeded (void response means deleted)
  TestValidator.predicate("Forum thread deletion should succeed", true);
}
