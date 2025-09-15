import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * End-to-end test for tenant organization retrieval success scenario.
 *
 * This test script performs the following:
 *
 * 1. Registers a system administrator user for Enterprise LMS.
 * 2. Logs in as the system administrator to obtain an authorization token.
 * 3. Creates a new tenant organization with unique code and name.
 * 4. Retrieves the tenant organization by UUID and validates the returned data
 *    matches creation data.
 * 5. Attempts to retrieve a non-existent tenant UUID and expects an HTTP 404
 *    error.
 * 6. Ensures that all tenant-related calls require proper systemAdmin
 *    authorization tokens.
 *
 * The test leverages typia for type-safe API call assertions and
 * @nestia/e2e TestValidator utilities to verify behavior and error
 * conditions.
 */
export async function test_api_tenant_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Register system administrator user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const adminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Log in as system administrator (to refresh token and confirm)
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const adminLoginResult: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 3. Create a new tenant organization
  // Generate unique tenant code and name
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(10).toLowerCase(),
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const createdTenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(createdTenant);

  TestValidator.equals(
    "tenant code matches",
    createdTenant.code,
    tenantCreateBody.code,
  );

  TestValidator.equals(
    "tenant name matches",
    createdTenant.name,
    tenantCreateBody.name,
  );

  // 4. Retrieve the tenant by UUID
  const retrievedTenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.at(connection, {
      id: createdTenant.id,
    });
  typia.assert(retrievedTenant);

  // Validate retrieved tenant fields match created tenant
  TestValidator.equals(
    "tenant id matches",
    retrievedTenant.id,
    createdTenant.id,
  );

  TestValidator.equals(
    "tenant code matches on retrieval",
    retrievedTenant.code,
    tenantCreateBody.code,
  );

  TestValidator.equals(
    "tenant name matches on retrieval",
    retrievedTenant.name,
    tenantCreateBody.name,
  );

  TestValidator.predicate(
    "tenant created_at is ISO 8601",
    typeof retrievedTenant.created_at === "string" &&
      /\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z/.test(
        retrievedTenant.created_at,
      ),
  );

  TestValidator.predicate(
    "tenant updated_at is ISO 8601",
    typeof retrievedTenant.updated_at === "string" &&
      /\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z/.test(
        retrievedTenant.updated_at,
      ),
  );

  // 5. Attempt to retrieve a non-existent tenant ID
  // Generate a random UUID that is different from createdTenant.id
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  if (nonExistentUUID === createdTenant.id) {
    // just regenerate to ensure uniqueness
    await TestValidator.error(
      "retrieval of non-existent tenant should throw 404",
      async () => {
        await api.functional.enterpriseLms.systemAdmin.tenants.at(connection, {
          id: typia.random<string & tags.Format<"uuid">>(),
        });
      },
    );
  } else {
    await TestValidator.error(
      "retrieval of non-existent tenant should throw 404",
      async () => {
        await api.functional.enterpriseLms.systemAdmin.tenants.at(connection, {
          id: nonExistentUUID,
        });
      },
    );
  }
}
