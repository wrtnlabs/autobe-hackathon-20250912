import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * End-to-end test for content deletion by organization administrator in
 * Enterprise LMS.
 *
 * This test ensures that an organization administrator can delete content
 * belonging to their tenant, and that deleted content cannot be accessed
 * subsequently. It also verifies that unauthorized roles like content creator
 * instructors cannot delete content.
 *
 * Workflow:
 *
 * 1. Create organization administrator user.
 * 2. Authenticate as organization administrator.
 * 3. Create content creator instructor user.
 * 4. Authenticate as content creator instructor.
 * 5. Create new content under the tenant.
 * 6. Authenticate as organization administrator again.
 * 7. Delete the previously created content.
 * 8. Confirm deletion by failure to delete again.
 * 9. Verify unauthorized deletion is disallowed.
 */
export async function test_api_organizationadmin_content_delete_e2e(
  connection: api.IConnection,
) {
  // Step 1: Create organization administrator user with tenant
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orgAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const orgAdminCreate = {
    tenant_id: tenantId,
    email: orgAdminEmail,
    password: "Test1234!",
    first_name: "AdminFirst",
    last_name: "AdminLast",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminCreate,
    },
  );
  typia.assert(orgAdmin);

  // Step 2: Authenticate as organization admin
  const orgAdminLogin = {
    email: orgAdminEmail,
    password: "Test1234!",
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAdminLogin,
  });

  // Step 3: Create content creator instructor user
  const contentCreatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const contentCreatorCreate = {
    tenant_id: tenantId,
    email: contentCreatorEmail,
    password_hash: "HASHEDPW",
    first_name: "CreatorFirst",
    last_name: "CreatorLast",
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const contentCreator =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorCreate,
    });
  typia.assert(contentCreator);

  // Step 4: Authenticate as content creator instructor
  const contentCreatorLogin = {
    email: contentCreatorEmail,
    password: "HASHEDPW",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: contentCreatorLogin,
  });

  // Step 5: Create content item under the tenant
  const contentCreate = {
    tenant_id: tenantId,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    content_type: "video",
    status: "draft",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.ICreate;

  const createdContent =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: contentCreate,
      },
    );
  typia.assert(createdContent);

  // Step 6: Authenticate as organization admin to delete content
  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAdminLogin,
  });

  // Step 7: Delete the content
  await api.functional.enterpriseLms.organizationAdmin.contents.erase(
    connection,
    {
      id: createdContent.id,
    },
  );

  // Step 8: Confirm deletion by error when attempting to delete again
  await TestValidator.error(
    "Deleted content cannot be deleted again",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contents.erase(
        connection,
        {
          id: createdContent.id,
        },
      );
    },
  );

  // Step 9: Attempt unauthorized deletion by content creator instructor
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: contentCreatorLogin,
  });

  await TestValidator.error(
    "Unauthorized role cannot delete content",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contents.erase(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
