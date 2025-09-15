import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * Test the update endpoint for organization administrator users under an
 * authenticated organization admin.
 *
 * This test covers a complete user journey examining admin creation, tenant
 * creation, org admin user creation, and update operations within proper
 * tenant isolation and authorization context.
 *
 * Steps:
 *
 * 1. Register and login a system administrator.
 * 2. Create a tenant organization.
 * 3. Register and login an organization administrator tied to the tenant.
 * 4. Create another organization administrator user under the same tenant.
 * 5. Update this created org admin's email, first name, last name, and status.
 * 6. Confirm the update reflects correctly.
 * 7. Verify tenant isolation and proper tenant id assignment.
 *
 * The test ensures the update operation works properly and does not break
 * tenant isolation.
 */
export async function test_api_organization_admin_update_organization_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register and login a system administrator
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  const systemAdminLoginBody = {
    email: systemAdmin.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const systemAdminLogin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminLogin);

  // 2. Create a tenant organization
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(3),
  } satisfies IEnterpriseLmsTenant.ICreate;
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 3. Create and authenticate an organization administrator in the tenant
  const orgAdminCreateBody = {
    tenant_id: tenant.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdminAuthorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdminAuthorized);

  const orgAdminLoginBody = {
    email: orgAdminAuthorized.email,
    password: orgAdminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const orgAdminLogin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: orgAdminLoginBody,
    });
  typia.assert(orgAdminLogin);

  // 4. Create another organization admin user
  const otherOrgAdminCreateBody = {
    tenant_id: tenant.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const otherOrgAdmin: IEnterpriseLmsOrganizationAdmin =
    await api.functional.enterpriseLms.organizationAdmin.organizationadmins.create(
      connection,
      {
        body: otherOrgAdminCreateBody,
      },
    );
  typia.assert(otherOrgAdmin);

  // 5. Update the second organization's admin user
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "suspended",
  } satisfies IEnterpriseLmsOrganizationAdmin.IUpdate;

  const updatedOrgAdmin: IEnterpriseLmsOrganizationAdmin =
    await api.functional.enterpriseLms.organizationAdmin.organizationadmins.update(
      connection,
      {
        organizationadminId: otherOrgAdmin.id,
        body: updateBody,
      },
    );
  typia.assert(updatedOrgAdmin);

  // 6. Validate updated fields
  TestValidator.equals(
    "Updated email should match",
    updatedOrgAdmin.email,
    updateBody.email,
  );
  TestValidator.equals(
    "Updated first name should match",
    updatedOrgAdmin.first_name,
    updateBody.first_name,
  );
  TestValidator.equals(
    "Updated last name should match",
    updatedOrgAdmin.last_name,
    updateBody.last_name,
  );
  TestValidator.equals(
    "Updated status should match",
    updatedOrgAdmin.status,
    updateBody.status,
  );

  // 7. Validate tenant isolation
  const tenantIdLengthCheck =
    typeof systemAdmin.tenant_id === "string" &&
    systemAdmin.tenant_id.length > 0;
  TestValidator.predicate(
    "SystemAdmin tenant_id is a non-empty string",
    tenantIdLengthCheck,
  );
  TestValidator.equals(
    "Tenant ID should match for orgAdmin and otherOrgAdmin",
    tenant.id,
    orgAdminAuthorized.tenant_id,
  );
  TestValidator.equals(
    "Tenant ID should match for orgAdmin and otherOrgAdmin",
    tenant.id,
    otherOrgAdmin.tenant_id,
  );
  TestValidator.equals(
    "Tenant ID should match for orgAdminAuthorized and updatedOrgAdmin",
    orgAdminAuthorized.tenant_id,
    updatedOrgAdmin.tenant_id,
  );
}
