import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * End-to-end test that validates the creation of a tenant organization by a
 * system administrator.
 *
 * This involves:
 *
 * 1. Registering a unique system administrator user (join).
 * 2. Logging in as the system administrator to obtain JWT authorization
 *    tokens.
 * 3. Creating a tenant with a unique code and name.
 * 4. Validating the created tenant's response fields (id, code, name,
 *    timestamps).
 * 5. Testing duplicate tenant code creation failure.
 * 6. Validating authorization by attempting tenant creation from an
 *    unauthenticated connection.
 *
 * All API responses are asserted for type correctness using typia.assert.
 */
export async function test_api_tenant_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new system administrator (sign-up)
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const sysAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(sysAdmin);

  // 2. Login with the same system administrator credentials
  const loginBody = {
    email: joinBody.email,
    password_hash: joinBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loginResult: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // 3. Create a new tenant with unique code and name
  // Generate tenant code with domain-like format to keep uniqueness and realism
  const tenantCode = `tenant_${RandomGenerator.alphaNumeric(6)}`;
  const tenantName = `Tenant ${RandomGenerator.name(2)}`;
  const tenantCreateBody = {
    code: tenantCode,
    name: tenantName,
  } satisfies IEnterpriseLmsTenant.ICreate;

  const createdTenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });

  typia.assert(createdTenant);

  TestValidator.predicate(
    "tenant id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdTenant.id,
    ),
  );

  TestValidator.equals("tenant code matches", createdTenant.code, tenantCode);
  TestValidator.equals("tenant name matches", createdTenant.name, tenantName);
  TestValidator.predicate(
    "tenant created_at is ISO8601 date",
    new Date(createdTenant.created_at).toISOString() ===
      createdTenant.created_at,
  );
  TestValidator.predicate(
    "tenant updated_at is ISO8601 date",
    new Date(createdTenant.updated_at).toISOString() ===
      createdTenant.updated_at,
  );

  // 4. Attempt to create tenant with duplicate code, expect conflict error
  await TestValidator.error(
    "duplicate tenant code creation should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.tenants.create(
        connection,
        {
          body: tenantCreateBody,
        },
      );
    },
  );

  // 5. Test authorization - attempt tenant creation with unauthenticated connection
  // Create an unauthenticated connection by copying original and clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized tenant creation attempt should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.tenants.create(
        unauthConn,
        {
          body: {
            code: `unauth_${RandomGenerator.alphaNumeric(6)}`,
            name: `Unauthorized Tenant ${RandomGenerator.name(2)}`,
          } satisfies IEnterpriseLmsTenant.ICreate,
        },
      );
    },
  );
}
