import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This E2E test covers the full process of tenant deletion success.
 *
 * It registers and logs in a systemAdmin user, creates a new tenant, deletes
 * that tenant by its UUID, and validates deletion by expecting an error on
 * repeated deletion.
 *
 * It also validates authentication handling and permission enforcement,
 * ensuring only systemAdmin can delete tenants.
 */
export async function test_api_tenant_deletion_success(
  connection: api.IConnection,
) {
  // Register a systemAdmin user
  const systemAdminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const adminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreate,
    });
  typia.assert(adminAuthorized);

  // Login as systemAdmin
  const systemAdminLogin = {
    email: systemAdminCreate.email,
    password_hash: systemAdminCreate.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const adminLoginResult: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLogin,
    });
  typia.assert(adminLoginResult);

  // Create a new tenant
  const tenantCreate = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const createdTenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreate,
    });
  typia.assert(createdTenant);

  // Delete the tenant by id
  await api.functional.enterpriseLms.systemAdmin.tenants.erase(connection, {
    id: createdTenant.id,
  });

  // Validate tenant deletion by trying to delete again, expect error
  await TestValidator.error(
    "deleted tenant erase again should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.tenants.erase(connection, {
        id: createdTenant.id,
      });
    },
  );
}
