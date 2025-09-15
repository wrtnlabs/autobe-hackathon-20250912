import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

export async function test_api_forum_thread_detail_access_with_system_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register systemAdmin user
  const systemAdminCreateBody = {
    email: `admin${Date.now()}@example.com`,
    password_hash: "hashed_password_1234",
    first_name: "System",
    last_name: "Admin",
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Login as systemAdmin
  const systemAdminLoginBody = {
    email: systemAdmin.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const systemAdminLoggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminLoggedIn);

  // 3. Register organizationAdmin user for Forum ownership
  const orgAdminCreateBody = {
    tenant_id: systemAdminLoggedIn.tenant_id,
    email: `orgadmin${Date.now()}@example.com`,
    password: "password1234",
    first_name: "Org",
    last_name: "Admin",
    status: undefined,
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdmin);

  // 4. Login as organizationAdmin (to create forum as owner)
  const orgAdminLoginBody = {
    email: orgAdmin.email,
    password: orgAdminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const orgAdminLoggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: orgAdminLoginBody,
    });
  typia.assert(orgAdminLoggedIn);

  // 5. Create a forum as organizationAdmin owner
  const forumCreateBody = {
    tenant_id: systemAdminLoggedIn.tenant_id,
    owner_id: orgAdmin.id,
    name: `Forum-${Date.now()}`,
    description: `Test Forum Description ${Date.now()}`,
  } satisfies IEnterpriseLmsForums.ICreate;
  const forum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      { body: forumCreateBody },
    );
  typia.assert(forum);

  // 6. Switch back to systemAdmin (already authenticated) to create forum thread
  //    No explicit login call is needed since token is managed by SDK automatically

  // 7. Create a forum thread in the forum
  const forumThreadCreateBody = {
    forum_id: forum.id,
    author_id: systemAdmin.id,
    title: `Thread Title ${Date.now()}`,
    body: `This is a test thread body for thread creation at ${new Date().toISOString()}`,
  } satisfies IEnterpriseLmsForumThread.ICreate;
  const forumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.systemAdmin.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: forumThreadCreateBody,
      },
    );
  typia.assert(forumThread);

  // 8. Retrieve detailed forum thread information as systemAdmin
  const forumThreadDetail: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.systemAdmin.forums.forumThreads.at(
      connection,
      {
        forumId: forum.id,
        forumThreadId: forumThread.id,
      },
    );
  typia.assert(forumThreadDetail);

  // 9. Validate that expected properties and IDs match
  TestValidator.equals(
    "forum thread id matches",
    forumThreadDetail.id,
    forumThread.id,
  );
  TestValidator.equals(
    "forum id matches",
    forumThreadDetail.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "forum thread author id matches",
    forumThreadDetail.author_id,
    systemAdmin.id,
  );

  // 10. Validate that required datetime properties are valid ISO strings
  TestValidator.predicate(
    "created_at is ISO datetime format",
    typeof forumThreadDetail.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
        forumThreadDetail.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO datetime format",
    typeof forumThreadDetail.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
        forumThreadDetail.updated_at,
      ),
  );

  // 11. Validate that deleted_at is either null or ISO string if present
  if (
    forumThreadDetail.deleted_at !== null &&
    forumThreadDetail.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is ISO datetime format or null",
      typeof forumThreadDetail.deleted_at === "string" &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
          forumThreadDetail.deleted_at!,
        ),
    );
  }
}
