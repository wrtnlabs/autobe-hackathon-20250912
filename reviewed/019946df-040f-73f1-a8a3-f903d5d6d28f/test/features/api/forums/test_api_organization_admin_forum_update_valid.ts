import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This end-to-end test verifies the complete workflow of updating an existing
 * forum by an authenticated organization administrator within the enterprise
 * LMS multi-tenant environment. It covers authentication, forum creation,
 * updating, and validation of business rules. The scenario tests multi-tenant
 * isolation and unique forum name constraints.
 */
export async function test_api_organization_admin_forum_update_valid(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as organization administrator
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const adminEmail = `${RandomGenerator.name(1)}@example.com`;

  const admin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: adminEmail,
        password: "validPassword123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a new forum for this tenant+owner
  const forumCreateBody = {
    tenant_id: tenantId,
    owner_id: admin.id,
    name: `Forum_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEnterpriseLmsForums.ICreate;

  const createdForum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: forumCreateBody,
      },
    );
  typia.assert(createdForum);

  TestValidator.equals(
    "forum tenantId matches admin tenant",
    createdForum.tenant_id,
    tenantId,
  );

  TestValidator.equals(
    "forum ownerId matches admin id",
    createdForum.owner_id,
    admin.id,
  );

  TestValidator.equals(
    "forum name matches create request",
    createdForum.name,
    forumCreateBody.name,
  );

  // Step 3: Update the forum with new name and description
  const newForumName = `Forum_${RandomGenerator.alphaNumeric(6)}`;
  const newForumDescription = RandomGenerator.paragraph({ sentences: 3 });
  const forumUpdateBody = {
    name: newForumName,
    description: newForumDescription,
  } satisfies IEnterpriseLmsForums.IUpdate;

  const updatedForum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.update(
      connection,
      {
        forumId: createdForum.id,
        body: forumUpdateBody,
      },
    );
  typia.assert(updatedForum);

  // Validate that updated properties are reflected
  TestValidator.equals("updated forum name", updatedForum.name, newForumName);

  TestValidator.equals(
    "updated forum description",
    updatedForum.description,
    newForumDescription,
  );

  // Validate tenant and owner remain the same
  TestValidator.equals(
    "tenant_id unchanged",
    updatedForum.tenant_id,
    createdForum.tenant_id,
  );
  TestValidator.equals(
    "owner_id unchanged",
    updatedForum.owner_id,
    createdForum.owner_id,
  );

  // Step 4: Attempt to update forum with duplicate name within the tenant
  // Create another forum with a unique name to test duplicate name collision
  const otherForumName = `Forum_${RandomGenerator.alphaNumeric(6)}`;
  const otherForumCreateBody = {
    tenant_id: tenantId,
    owner_id: admin.id,
    name: otherForumName,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IEnterpriseLmsForums.ICreate;

  const otherForum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: otherForumCreateBody,
      },
    );
  typia.assert(otherForum);

  // Try to rename updatedForum to the name of otherForum, which should fail
  const duplicateNameUpdate = {
    name: otherForumName,
  } satisfies IEnterpriseLmsForums.IUpdate;

  await TestValidator.error(
    "updating forum to duplicate name within tenant should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.forums.update(
        connection,
        {
          forumId: updatedForum.id,
          body: duplicateNameUpdate,
        },
      );
    },
  );
}
