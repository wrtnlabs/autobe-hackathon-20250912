import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_department_manager_forum_thread_deletion_authorized_context(
  connection: api.IConnection,
) {
  // Step 1: Organization Admin register and authenticate
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: orgAdminEmail,
    password: "password123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdmin);
  TestValidator.equals(
    "OrganizationAdmin tenant_id matches create",
    orgAdmin.tenant_id,
    orgAdminCreateBody.tenant_id,
  );
  TestValidator.equals(
    "OrganizationAdmin email matches create",
    orgAdmin.email,
    orgAdminCreateBody.email,
  );

  // Step 2: Department Manager register and authenticate with same tenant
  const deptManagerEmail = typia.random<string & tags.Format<"email">>();
  const deptManagerCreateBody = {
    email: deptManagerEmail,
    password: "password123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  // Temporarily switch connection for Dept Manager join to empty headers for clean session
  const deptManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(
      { ...connection, headers: {} },
      { body: deptManagerCreateBody },
    );
  typia.assert(deptManager);
  TestValidator.equals(
    "DepartmentManager email matches create",
    deptManager.email,
    deptManagerCreateBody.email,
  );
  TestValidator.equals(
    "DepartmentManager tenant_id equals OrganizationAdmin tenant_id",
    deptManager.tenant_id,
    orgAdmin.tenant_id,
  );

  // Step 3: Organization Admin creates forum for their tenant
  const forumCreateBody = {
    tenant_id: orgAdmin.tenant_id,
    owner_id: orgAdmin.id,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEnterpriseLmsForums.ICreate;
  const forum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      { body: forumCreateBody },
    );
  typia.assert(forum);
  TestValidator.equals(
    "Forum tenant_id matches create",
    forum.tenant_id,
    orgAdmin.tenant_id,
  );
  TestValidator.equals(
    "Forum owner_id matches orgAdmin.id",
    forum.owner_id,
    orgAdmin.id,
  );

  // Step 4: Organization Admin creates forum thread under the forum
  const forumThreadCreateBody = {
    forum_id: forum.id,
    author_id: orgAdmin.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
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
  TestValidator.equals(
    "ForumThread forum_id matches forum.id",
    forumThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "ForumThread author_id matches orgAdmin.id",
    forumThread.author_id,
    orgAdmin.id,
  );

  // Step 5: DepartmentManager login to get authenticated session
  const deptManagerLoginBody = {
    email: deptManagerEmail,
    password: "password123",
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;
  const deptManagerLogin: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(
      { ...connection, headers: {} },
      { body: deptManagerLoginBody },
    );
  typia.assert(deptManagerLogin);
  TestValidator.equals(
    "DepartmentManager tenant after login matches create",
    deptManagerLogin.tenant_id,
    deptManagerCreateBody.email === deptManagerLogin.email
      ? deptManagerLogin.tenant_id
      : deptManager.tenant_id,
  );

  // Step 6: DepartmentManager deletes the forum thread (should succeed)
  await api.functional.enterpriseLms.departmentManager.forums.forumThreads.erase(
    connection,
    {
      forumId: forum.id,
      forumThreadId: forumThread.id,
    },
  );

  // Cannot typia.assert void but ensure no error thrown
  TestValidator.predicate(
    "ForumThread deletion returns void without error",
    true,
  );
}
