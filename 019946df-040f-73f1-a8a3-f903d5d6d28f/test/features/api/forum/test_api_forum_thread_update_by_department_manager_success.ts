import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_forum_thread_update_by_department_manager_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a department manager user
  const deptManagerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const deptManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: {
        email: deptManagerEmail,
        password: "SecurePass123!",
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
      } satisfies IEnterpriseLmsDepartmentManager.ICreate,
    });
  typia.assert(deptManager);

  // 2. Register and authenticate an organization admin user
  const orgAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: deptManager.tenant_id,
        email: orgAdminEmail,
        password: "SecurePass123!",
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdmin);

  // 3. Switch connection auth to organization admin for forum creation
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "SecurePass123!",
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 4. Create a forum for the department manager's tenant (as organization admin)
  const forumName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 7,
  });
  const forumDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 6,
  });
  const forum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: {
          tenant_id: deptManager.tenant_id,
          owner_id: deptManager.id,
          name: forumName,
          description: forumDescription,
        } satisfies IEnterpriseLmsForums.ICreate,
      },
    );
  typia.assert(forum);

  // 5. Switch back to department manager user for forum thread operations
  await api.functional.auth.departmentManager.login(connection, {
    body: {
      email: deptManagerEmail,
      password: "SecurePass123!",
    } satisfies IEnterpriseLmsDepartmentManager.ILogin,
  });

  // 6. Create a forum thread inside this forum
  const threadTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 6,
    wordMax: 10,
  });
  const threadBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 8,
  });
  const thread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.departmentManager.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: {
          forum_id: forum.id,
          author_id: deptManager.id,
          title: threadTitle,
          body: threadBody,
        } satisfies IEnterpriseLmsForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 7. Update the thread title and body
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 6,
    wordMax: 12,
  });
  const updatedBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.departmentManager.forums.forumThreads.update(
      connection,
      {
        forumId: forum.id,
        forumThreadId: thread.id,
        body: {
          title: updatedTitle,
          body: updatedBody,
        } satisfies IEnterpriseLmsForumThread.IUpdate,
      },
    );
  typia.assert(updatedThread);

  // Validation: check that update took effect
  TestValidator.equals(
    "updated thread id equals original",
    updatedThread.id,
    thread.id,
  );
  TestValidator.equals(
    "updated thread forum id equals original",
    updatedThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "updated thread author id equals original",
    updatedThread.author_id,
    deptManager.id,
  );
  TestValidator.equals(
    "updated thread title matches",
    updatedThread.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated thread body matches",
    updatedThread.body,
    updatedBody,
  );
}
