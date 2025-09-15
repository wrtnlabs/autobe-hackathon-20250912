import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * End-to-end test for creating an organization administrator within the
 * Enterprise LMS.
 *
 * This test covers full multi-role authentication, tenant creation, and
 * organization admin user creation.
 *
 * It achieves the following:
 *
 * 1. Registers and authenticates a system administrator.
 * 2. Creates a tenant organization via system administrator.
 * 3. Registers and authenticates an organization administrator.
 * 4. Creates a new organization administrator user under the tenant using the org
 *    admin context.
 * 5. Validates the created organization admin user properties and tenant linkage.
 * 6. Ensures uniqueness constraint on email by testing duplicate email error.
 */
export async function test_api_organization_admin_creation_organization_admin_auth(
  connection: api.IConnection,
) {
  // 1. System Administrator joins
  const systemAdminCreateBody = {
    email: `sysadmin_${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: typia.random<string>(),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. System Administrator login
  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const systemAdminLogin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminLogin);

  // 3. System Admin creates tenant
  const tenantCreateBody = {
    code: `tenant_code_${RandomGenerator.alphaNumeric(6)}`,
    name: `Tenant Name ${RandomGenerator.name(2)}`,
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 4. Organization Admin joins
  const orgAdminCreateBody = {
    tenant_id: tenant.id,
    email: `orgadmin_${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: "OrgAdminPass!23",
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdmin);

  // 5. Organization Admin login
  const orgAdminLoginBody = {
    email: orgAdminCreateBody.email,
    password: orgAdminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const orgAdminLogin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: orgAdminLoginBody,
    });
  typia.assert(orgAdminLogin);

  // 6. Create new organization admin via OrgAdmin context
  const newOrgAdminCreateBody = {
    tenant_id: tenant.id,
    email: `created_${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: "StrongPass12345",
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const newOrgAdmin: IEnterpriseLmsOrganizationAdmin =
    await api.functional.enterpriseLms.organizationAdmin.organizationadmins.create(
      connection,
      {
        body: newOrgAdminCreateBody,
      },
    );
  typia.assert(newOrgAdmin);

  TestValidator.equals(
    "newOrgAdmin tenant_id equals tenant.id",
    newOrgAdmin.tenant_id,
    tenant.id,
  );
  TestValidator.equals(
    "newOrgAdmin email equals input",
    newOrgAdmin.email,
    newOrgAdminCreateBody.email,
  );
  TestValidator.predicate(
    "newOrgAdmin password_hash is non-empty",
    typeof newOrgAdmin.password_hash === "string" &&
      newOrgAdmin.password_hash.length > 0,
  );
  TestValidator.predicate(
    "newOrgAdmin status is a string",
    typeof newOrgAdmin.status === "string" && newOrgAdmin.status.length > 0,
  );

  // 7. Attempt duplicate email creation, should throw error
  await TestValidator.error(
    "duplicate email creation throws error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.organizationadmins.create(
        connection,
        {
          body: {
            tenant_id: tenant.id,
            email: newOrgAdminCreateBody.email, // duplicate
            password: "AnotherPass123",
            first_name: RandomGenerator.name(2),
            last_name: RandomGenerator.name(2),
          } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
        },
      );
    },
  );
}
