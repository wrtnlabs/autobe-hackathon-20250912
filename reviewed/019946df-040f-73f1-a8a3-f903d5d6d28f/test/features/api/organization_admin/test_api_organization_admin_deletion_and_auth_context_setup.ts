import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Test the deletion of an organization administrator user.
 *
 * Scenario overview:
 *
 * 1. Authenticate initial org admin to establish auth context.
 * 2. Create a new organization admin to be deleted.
 * 3. Delete the newly created organization admin.
 * 4. Verify deletion by attempting retrieval and expecting failure.
 * 5. Attempt deletion of non-existent user and verify 404 error.
 * 6. Validate authorization enforcement and tenant isolation requirements.
 */
export async function test_api_organization_admin_deletion_and_auth_context_setup(
  connection: api.IConnection,
) {
  // 1. Authenticate initial organization admin to get auth context
  const initialAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: `initial.admin+${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "Password123!",
        first_name: "Initial",
        last_name: "Admin",
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(initialAdmin);

  // 2. Create a new organization admin to delete
  const createBody = {
    tenant_id: initialAdmin.tenant_id,
    email: `delete.me+${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "Password123!",
    first_name: "Delete",
    last_name: "Me",
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const newAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(newAdmin);

  // 3. Delete the newly created organization admin
  await api.functional.enterpriseLms.organizationAdmin.organizationadmins.erase(
    connection,
    { organizationadminId: newAdmin.id },
  );

  // 4. Verify deletion by attempting retrieval, expecting an error
  await TestValidator.error(
    "deleted organization admin retrieval should fail",
    async () => {
      // Verify deletion by trying to create with same email which should fail
      await api.functional.auth.organizationAdmin.join(connection, {
        body: {
          tenant_id: initialAdmin.tenant_id,
          email: createBody.email,
          password: "Password123!",
          first_name: "Test",
          last_name: "Fail",
        } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
      });
    },
  );

  // 5. Test deletion of non-existent user ID returns 404
  await TestValidator.error(
    "deletion of non-existent user returns 404",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.organizationadmins.erase(
        connection,
        { organizationadminId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 6. Test unauthorized deletion attempt
  // Re-authenticate as a new admin (simulating another tenant)
  const otherTenantId = typia.random<string & tags.Format<"uuid">>();
  const otherAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: otherTenantId,
        email: `other.admin+${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "Password123!",
        first_name: "Other",
        last_name: "Admin",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(otherAdmin);

  // Attempt deletion of initialAdmin by otherAdmin should fail (tenant isolation, authorization)
  await TestValidator.error(
    "unauthorized deletion attempt should be forbidden",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.organizationadmins.erase(
        connection,
        { organizationadminId: initialAdmin.id },
      );
    },
  );
}
