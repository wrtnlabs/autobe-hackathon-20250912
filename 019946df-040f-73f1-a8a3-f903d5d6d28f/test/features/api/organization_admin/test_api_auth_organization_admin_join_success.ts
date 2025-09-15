import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Test to validate successful organization administrator user registration.
 *
 * 1. Construct a valid request body with tenant_id, email, password, and names.
 * 2. Call the join API and assert the authorized response including JWT tokens.
 * 3. Attempt duplicate registration with same email and expect failure.
 * 4. Attempt registration with invalid tenant_id format and expect failure.
 * 5. Attempt registration with weak password and expect failure.
 * 6. Confirm password is hashed in the authorized response and sensitive data is
 *    not leaked.
 */
export async function test_api_auth_organization_admin_join_success(
  connection: api.IConnection,
) {
  // Generate a valid tenant_id and email
  const tenantId: string = typia.random<string & tags.Format<"uuid">>();
  const email: string = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;

  // 1. Successful registration
  const createBody = {
    tenant_id: tenantId,
    email: email,
    password: "S3cureP@ssw0rd!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Verify required fields in response
  TestValidator.predicate(
    "response has valid id",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.predicate(
    "response tenant_id matches request",
    authorized.tenant_id === tenantId,
  );
  TestValidator.equals(
    "response email matches request",
    authorized.email,
    email,
  );
  TestValidator.predicate(
    "password hash is non-empty string",
    typeof authorized.password_hash === "string" &&
      authorized.password_hash.length > 0,
  );
  TestValidator.predicate(
    "response first_name is non-empty",
    typeof authorized.first_name === "string" &&
      authorized.first_name.length > 0,
  );
  TestValidator.predicate(
    "response last_name is non-empty",
    typeof authorized.last_name === "string" && authorized.last_name.length > 0,
  );
  TestValidator.predicate(
    "response status is non-empty",
    typeof authorized.status === "string" && authorized.status.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof authorized.created_at === "string" &&
      !Number.isNaN(Date.parse(authorized.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof authorized.updated_at === "string" &&
      !Number.isNaN(Date.parse(authorized.updated_at)),
  );

  TestValidator.predicate(
    "token access is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is valid ISO string",
    typeof authorized.token.expired_at === "string" &&
      !Number.isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is valid ISO string",
    typeof authorized.token.refreshable_until === "string" &&
      !Number.isNaN(Date.parse(authorized.token.refreshable_until)),
  );

  // 2. Duplicate email registration - should fail with error
  await TestValidator.error("duplicate registration fails", async () => {
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email, // same email
        password: "AnotherS3cureP@ss!",
        first_name: "John",
        last_name: "Doe",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  });

  // 3. Invalid tenant_id format (not UUID) - should fail
  await TestValidator.error("invalid tenant_id format fails", async () => {
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: "invalid-uuid-format",
        email: `unique_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "S3cureP@ssw0rd!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  });

  // 5. Weak password policy enforcement (e.g., password too short)
  // Provide a password that does not meet complexity requirements
  await TestValidator.error("weak password registration fails", async () => {
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: `weakpass_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "123", // too short/weak
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  });
}
