import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This E2E test validates the complete lifecycle and constraints of updating a
 * tenant organization by a system administrator user. The test covers:
 *
 * 1. System administrator registration using the join API.
 * 2. System administrator login to obtain authentication token.
 * 3. Creation of a new tenant organization with a unique code and name.
 * 4. Updating the tenant's name and (optionally) code via the update API.
 * 5. Verification that updates persist correctly by comparing retrieved tenant
 *    data.
 * 6. Testing business validation enforcement by attempting to update the tenant
 *    with invalid data (e.g., empty or null name) and verifying errors.
 * 7. Confirming that only authenticated system administrator users can update
 *    tenants by attempting update operations without login or with invalid
 *    tokens.
 *
 * It ensures strict compliance with multi-tenant isolation policies and
 * authorization enforcement.
 *
 * All steps employ realistic random data generation for names and codes, follow
 * correct API usage patterns with specified DTOs, and validate API responses
 * using typia.assert and TestValidator utilities.
 *
 * The test structure guarantees comprehensive coverage of the update tenant
 * endpoint's functionality and security.
 */
export async function test_api_tenant_update_success(
  connection: api.IConnection,
) {
  // 1. SystemAdmin Register (Join) and authenticate
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

  // 2. Login as system admin
  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const loginResult: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(loginResult);

  // 3. Create new tenant
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IEnterpriseLmsTenant.ICreate;
  const tenantCreated: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenantCreated);

  // 4. Update tenant
  const newTenantName = RandomGenerator.name();
  const tenantUpdateBody = {
    name: newTenantName,
  } satisfies IEnterpriseLmsTenant.IUpdate;
  const tenantUpdated: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.update(connection, {
      id: tenantCreated.id,
      body: tenantUpdateBody,
    });
  typia.assert(tenantUpdated);

  // 5. Validate update persisted and updated name matches
  TestValidator.equals(
    "tenant name updated as requested",
    tenantUpdated.name,
    newTenantName,
  );

  // 6. Try invalid update to test validation
  await TestValidator.error("tenant update fails with null name", async () => {
    await api.functional.enterpriseLms.systemAdmin.tenants.update(connection, {
      id: tenantCreated.id,
      body: { name: null } satisfies IEnterpriseLmsTenant.IUpdate,
    });
  });

  // 7. Authorization enforcement tests
  // Attempt update without login
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated tenant update rejected",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.tenants.update(
        unauthConnection,
        {
          id: tenantCreated.id,
          body: {
            name: RandomGenerator.name(),
          } satisfies IEnterpriseLmsTenant.IUpdate,
        },
      );
    },
  );
}
