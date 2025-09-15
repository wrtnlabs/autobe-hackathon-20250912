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
 * Test deletion of forum thread by authorized roles in multi-tenant Enterprise
 * LMS.
 *
 * Steps:
 *
 * 1. Create and authenticate systemAdmin user.
 * 2. Create tenant organization and obtain tenantId.
 * 3. Create and authenticate organizationAdmin user under tenant.
 * 4. Create a forum under tenant owned by organizationAdmin.
 * 5. Create a forum thread under the forum with organizationAdmin as author.
 * 6. Test forum thread deletion by systemAdmin and organizationAdmin - expect
 *    success and HTTP 204.
 * 7. Test deletion attempts by other authorized roles (departmentManager,
 *    contentCreatorInstructor) if feasible.
 * 8. Test that unauthorized roles cannot delete forum threads - expect error.
 * 9. Validate tenant data isolation prohibits cross-tenant deletion.
 * 10. Validate all API responses with typia.assert and use TestValidator for
 *     business validations.
 */
export async function test_api_forum_thread_deletion_by_authorized_roles(
  connection: api.IConnection,
) {
  // 1. Create and authenticate systemAdmin
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = RandomGenerator.alphaNumeric(16);
  const systemAdminCreateBody = {
    email: systemAdminEmail,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    password_hash: systemAdminPassword,
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Authenticate systemAdmin
  const systemAdminLoginBody = {
    email: systemAdminEmail,
    password_hash: systemAdminPassword,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const systemAdminLogin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminLogin);

  // 3. Create and authenticate organizationAdmin user under tenant
  const tenantId = systemAdmin.tenant_id;

  const organizationAdminEmail = typia.random<string & tags.Format<"email">>();
  const organizationAdminPassword = RandomGenerator.alphaNumeric(16);
  const orgAdminCreateBody = {
    tenant_id: tenantId,
    email: organizationAdminEmail,
    password: organizationAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(organizationAdmin);

  // Authenticate organizationAdmin
  const orgAdminLoginBody = {
    email: organizationAdminEmail,
    password: organizationAdminPassword,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const organizationAdminLogin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: orgAdminLoginBody,
    });
  typia.assert(organizationAdminLogin);

  // 4. Create forum owned by organizationAdmin
  const forumCreateBody = {
    tenant_id: tenantId,
    owner_id: organizationAdmin.id,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IEnterpriseLmsForums.ICreate;

  const forum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      { body: forumCreateBody },
    );
  typia.assert(forum);
  TestValidator.equals("forum tenant matches", forum.tenant_id, tenantId);
  TestValidator.equals(
    "forum owner matches",
    forum.owner_id,
    organizationAdmin.id,
  );

  // 5. Create forum thread under forum with organizationAdmin as author
  const forumThreadCreateBody = {
    forum_id: forum.id,
    author_id: organizationAdmin.id,
    title: RandomGenerator.name(3),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const forumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: forumThreadCreateBody,
      },
    );
  typia.assert(forumThread);

  // 6. Delete forum thread by systemAdmin - expect HTTP 204
  await api.functional.auth.systemAdmin.login(connection, {
    body: systemAdminLoginBody,
  });
  await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.erase(
    connection,
    {
      forumId: forum.id,
      forumThreadId: forumThread.id,
    },
  );

  // 7. Re-create forum thread for organizationAdmin deletion test
  const forumThread2: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: forumThreadCreateBody,
      },
    );
  typia.assert(forumThread2);

  // Authenticate as organizationAdmin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAdminLoginBody,
  });

  // Delete forum thread by organizationAdmin - expect HTTP 204
  await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.erase(
    connection,
    {
      forumId: forum.id,
      forumThreadId: forumThread2.id,
    },
  );

  // 8. No explicit API functions or DTOs for departmentManager, contentCreatorInstructor provided
  //    Cannot test those roles here due to lack of APIs and DTOs.

  // 9. Unauthorized deletion attempt test (simulate cross-tenant or unauthorized)
  // Create another organizationAdmin under different tenant

  // Create second systemAdmin to get another tenant
  const otherSystemAdminEmail = typia.random<string & tags.Format<"email">>();
  const otherSystemAdminPassword = RandomGenerator.alphaNumeric(16);
  const otherSystemAdminCreateBody = {
    email: otherSystemAdminEmail,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    password_hash: otherSystemAdminPassword,
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const otherSystemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: otherSystemAdminCreateBody,
    });
  typia.assert(otherSystemAdmin);

  // Authenticate second systemAdmin
  const otherSystemAdminLoginBody = {
    email: otherSystemAdminEmail,
    password_hash: otherSystemAdminPassword,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const otherSystemAdminLogin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: otherSystemAdminLoginBody,
    });
  typia.assert(otherSystemAdminLogin);

  // Create second organizationAdmin for other tenant
  const otherTenantId = otherSystemAdmin.tenant_id;
  const otherOrgAdminEmail = typia.random<string & tags.Format<"email">>();
  const otherOrgAdminPassword = RandomGenerator.alphaNumeric(16);
  const otherOrgAdminCreateBody = {
    tenant_id: otherTenantId,
    email: otherOrgAdminEmail,
    password: otherOrgAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const otherOrganizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: otherOrgAdminCreateBody,
    });
  typia.assert(otherOrganizationAdmin);

  // Authenticate other organizationAdmin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: otherOrgAdminEmail,
      password: otherOrgAdminPassword,
    },
  });

  // Recreate forum thread on first tenant's forum
  const forumThread3: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: forumThreadCreateBody,
      },
    );
  typia.assert(forumThread3);

  // Attempt unauthorized deletion: other tenant organizationAdmin tries to delete forum thread they do not own
  await TestValidator.error(
    "unauthorized cross-tenant deletion should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.erase(
        connection,
        {
          forumId: forum.id,
          forumThreadId: forumThread3.id,
        },
      );
    },
  );
}
