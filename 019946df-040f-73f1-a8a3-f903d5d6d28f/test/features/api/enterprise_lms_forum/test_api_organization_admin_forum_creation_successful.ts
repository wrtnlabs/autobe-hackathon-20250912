import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_organization_admin_forum_creation_successful(
  connection: api.IConnection,
) {
  // 1. Authenticate as organization administrator
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orgAdminEmail = `${RandomGenerator.alphaNumeric(8).toLowerCase()}@example.com`;

  const orgAdminCreateBody = {
    tenant_id: tenantId,
    email: orgAdminEmail,
    password: "SecureP@ssw0rd",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminCreateBody,
    },
  );
  typia.assert(orgAdmin);

  // 2. Create a new forum under the authenticated org admin's tenant
  const forumCreateBody = {
    tenant_id: tenantId,
    owner_id: orgAdmin.id,
    name: `Test Forum ${RandomGenerator.alphaNumeric(6)}`,
    description: "This is a test forum created during e2e tests.",
  } satisfies IEnterpriseLmsForums.ICreate;

  const forum =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: forumCreateBody,
      },
    );
  typia.assert(forum);

  TestValidator.equals("tenant ID should match", forum.tenant_id, tenantId);
  TestValidator.equals("owner ID should match", forum.owner_id, orgAdmin.id);
  TestValidator.equals(
    "forum name should match",
    forum.name,
    forumCreateBody.name,
  );
  TestValidator.equals(
    "forum description should match",
    forum.description ?? null,
    forumCreateBody.description,
  );
  TestValidator.predicate(
    "created_at timestamp should be valid ISO string",
    typeof forum.created_at === "string" &&
      /^[\d\-:TZ\.]+$/.test(forum.created_at),
  );
  TestValidator.predicate(
    "updated_at timestamp should be valid ISO string",
    typeof forum.updated_at === "string" &&
      /^[\d\-:TZ\.]+$/.test(forum.updated_at),
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    forum.deleted_at,
    null,
  );

  // Error validation: Attempt to create another forum with the same name under the same tenant should fail
  await TestValidator.error("duplicate forum name should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: {
          tenant_id: tenantId,
          owner_id: orgAdmin.id,
          name: forumCreateBody.name,
        } satisfies IEnterpriseLmsForums.ICreate,
      },
    );
  });

  // Missing tenant_id test is omitted to satisfy compile-time type safety rules
}
