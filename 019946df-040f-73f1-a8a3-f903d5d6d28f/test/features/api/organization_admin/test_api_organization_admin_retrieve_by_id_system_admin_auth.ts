import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * Tests retrieval of an organization administrator's detailed information
 * by UUID via system administrator auth.
 *
 * The test performs:
 *
 * 1. SystemAdmin join and login (creates/authenticates a system
 *    administrator).
 * 2. Tenant creation by systemAdmin.
 * 3. OrganizationAdmin join and login (creates/authenticates an organization
 *    admin).
 * 4. OrganizationAdmin creation under the previously created tenant by
 *    systemAdmin.
 * 5. Retrieval of the created organizationAdmin by UUID via systemAdmin
 *    authorization.
 * 6. Validation of the retrieved data matching creation inputs and ensuring
 *    tenant isolation.
 * 7. Error testing with non-existent and invalid UUID formats for
 *    organizationAdmin retrieval.
 */
export async function test_api_organization_admin_retrieve_by_id_system_admin_auth(
  connection: api.IConnection,
) {
  // 1. Create and authenticate system administrator (join & login)
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: systemAdminCreateBody,
  });
  typia.assert(systemAdmin);

  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const systemAdminAuth = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: systemAdminLoginBody,
    },
  );
  typia.assert(systemAdminAuth);

  // 2. Create a tenant organization
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant = await api.functional.enterpriseLms.systemAdmin.tenants.create(
    connection,
    {
      body: tenantCreateBody,
    },
  );
  typia.assert(tenant);

  // 3. Create and authenticate organization administrator (join & login)
  const organizationAdminCreateBodyInit = {
    tenant_id: tenant.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdminCreated =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminCreateBodyInit,
    });
  typia.assert(organizationAdminCreated);

  const organizationAdminLoginBody = {
    email: organizationAdminCreateBodyInit.email,
    password: organizationAdminCreateBodyInit.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const authenticatedOrganizationAdmin =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: organizationAdminLoginBody,
    });
  typia.assert(authenticatedOrganizationAdmin);

  // 4. Using system admin access, create organization admin user under the tenant
  // Build create body with password as plaintext as expected by API
  const createOrgAdminBody = {
    tenant_id: tenant.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const createdOrganizationAdmin =
    await api.functional.enterpriseLms.organizationAdmin.organizationadmins.create(
      connection,
      {
        body: createOrgAdminBody,
      },
    );
  typia.assert(createdOrganizationAdmin);

  TestValidator.equals(
    "organization admin's tenant_id should match created tenant id",
    createdOrganizationAdmin.tenant_id,
    tenant.id,
  );

  TestValidator.equals(
    "organization admin's email should match creation email",
    createdOrganizationAdmin.email,
    createOrgAdminBody.email,
  );

  // 5. Retrieve organization admin by ID under systemAdmin authorization
  const retrievedOrganizationAdmin =
    await api.functional.enterpriseLms.systemAdmin.organizationadmins.atOrganizationAdmin(
      connection,
      {
        organizationadminId: createdOrganizationAdmin.id,
      },
    );
  typia.assert(retrievedOrganizationAdmin);

  TestValidator.equals(
    "retrieved tenant id matches created tenant",
    retrievedOrganizationAdmin.tenant_id,
    tenant.id,
  );

  TestValidator.equals(
    "retrieved organization admin's email matches created user",
    retrievedOrganizationAdmin.email,
    createOrgAdminBody.email,
  );

  TestValidator.equals(
    "retrieved organization admin's first name matches",
    retrievedOrganizationAdmin.first_name,
    createOrgAdminBody.first_name,
  );

  TestValidator.equals(
    "retrieved organization admin's last name matches",
    retrievedOrganizationAdmin.last_name,
    createOrgAdminBody.last_name,
  );

  // 6. Test error on non-existent ID (random UUID)
  await TestValidator.error(
    "retrieval with non-existent organization admin ID should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.organizationadmins.atOrganizationAdmin(
        connection,
        {
          organizationadminId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Test error on invalid UUID format (string not matching UUID format)
  await TestValidator.error(
    "retrieval with invalid UUID format should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.organizationadmins.atOrganizationAdmin(
        connection,
        {
          organizationadminId: "invalid-uuid-format-string",
        },
      );
    },
  );
}
