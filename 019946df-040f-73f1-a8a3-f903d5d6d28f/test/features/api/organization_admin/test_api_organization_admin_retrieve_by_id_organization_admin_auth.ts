import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * Validate retrieval of organization administrator user details by ID under
 * organizationAdmin auth.
 *
 * This comprehensive test function validates the retrieval of an organization
 * administrator's details using their unique identifier, enforcing multi-tenant
 * isolation and organization admin role authentication. It simulates creating
 * system and organization admin users, tenant organizations, linking
 * organization admins to tenants, and performing retrieval with various
 * authentication contexts.
 *
 * Process:
 *
 * 1. Register and authenticate a systemAdmin user
 * 2. Create a tenant with systemAdmin authentication
 * 3. Create an organizationAdmin user linked to the tenant with systemAdmin auth
 * 4. Register and authenticate a different organizationAdmin user for
 *    role-switching
 * 5. Authenticate as the newly created organizationAdmin user and retrieve the
 *    organizationAdmin details by ID
 * 6. Validate the retrieved data matches the created organization admin user
 * 7. Test error handling for retrieval with invalid ID
 */
export async function test_api_organization_admin_retrieve_by_id_organization_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register systemAdmin user
  const systemAdminCreation = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreation,
    });
  typia.assert(systemAdmin);

  // 2. Authenticate systemAdmin user to set auth context
  const loggedSystemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: systemAdminCreation.email,
        password_hash: systemAdminCreation.password_hash,
      } satisfies IEnterpriseLmsSystemAdmin.ILogin,
    });
  typia.assert(loggedSystemAdmin);

  // 3. Create tenant organization
  const tenantCreation = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreation,
    });
  typia.assert(tenant);

  // 4. Create organizationAdmin user linked to tenant with systemAdmin auth
  const orgAdminCreation = {
    tenant_id: tenant.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin =
    await api.functional.enterpriseLms.organizationAdmin.organizationadmins.create(
      connection,
      {
        body: orgAdminCreation,
      },
    );
  typia.assert(organizationAdmin);

  // 5. Register and authenticate additional organizationAdmin user for role-switching
  const orgAdminSecondaryCreation = {
    tenant_id: tenant.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdminSecondary: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminSecondaryCreation,
    });
  typia.assert(orgAdminSecondary);

  const loggedOrgAdminSecondary: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: orgAdminSecondaryCreation.email,
        password: orgAdminSecondaryCreation.password,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(loggedOrgAdminSecondary);

  // 6. Retrieve organization administrator details by ID using organizationAdmin auth
  const retrievedOrganizationAdmin: IEnterpriseLmsOrganizationAdmin =
    await api.functional.enterpriseLms.organizationAdmin.organizationadmins.atOrganizationAdmin(
      connection,
      { organizationadminId: organizationAdmin.id },
    );
  typia.assert(retrievedOrganizationAdmin);

  // Validate retrieved data matches created org admin data
  TestValidator.equals(
    "organizationAdmin id match",
    retrievedOrganizationAdmin.id,
    organizationAdmin.id,
  );
  TestValidator.equals(
    "organizationAdmin tenant_id match",
    retrievedOrganizationAdmin.tenant_id,
    organizationAdmin.tenant_id,
  );
  TestValidator.equals(
    "organizationAdmin email match",
    retrievedOrganizationAdmin.email,
    organizationAdmin.email,
  );
  TestValidator.equals(
    "organizationAdmin first_name match",
    retrievedOrganizationAdmin.first_name,
    organizationAdmin.first_name,
  );
  TestValidator.equals(
    "organizationAdmin last_name match",
    retrievedOrganizationAdmin.last_name,
    organizationAdmin.last_name,
  );
  TestValidator.equals(
    "organizationAdmin status match",
    retrievedOrganizationAdmin.status,
    organizationAdmin.status,
  );

  // 7. Test error handling for invalid organizationadminId
  await TestValidator.error(
    "retrieve organizationAdmin with invalid id should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.organizationadmins.atOrganizationAdmin(
        connection,
        { organizationadminId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
