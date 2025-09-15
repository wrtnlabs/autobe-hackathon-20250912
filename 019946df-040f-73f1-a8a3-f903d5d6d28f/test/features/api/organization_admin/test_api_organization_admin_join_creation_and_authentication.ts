import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_organization_admin_join_creation_and_authentication(
  connection: api.IConnection,
) {
  // 1. Create new organization administrator account with valid data
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const email: string & tags.Format<"email"> =
    `test.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = "Password123!"; // Plain password to be hashed at backend
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  // Prepare request body
  const requestBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  // 2. Call the join API
  const authorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: requestBody,
    });

  // Validate response data
  typia.assert(authorized);

  // Check tenant_id assignment
  TestValidator.equals(
    "tenant_id matches input",
    authorized.tenant_id,
    tenantId,
  );

  // Check email assignment
  TestValidator.equals("email matches input", authorized.email, email);

  // Validate password is hashed (should not be plain text)
  TestValidator.predicate(
    "password_hash is hashed",
    authorized.password_hash !== password &&
      authorized.password_hash.length >= 60,
  );

  // Validate token accessibility
  TestValidator.predicate(
    "token access (access token) is non-empty",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh (refresh token) is non-empty",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // Validate token expiry fields
  TestValidator.predicate(
    "token expired_at is a valid ISO date string",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is a valid ISO date string",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );

  // 3. Error cases

  // 3.1 Duplicate email should fail
  await TestValidator.error("duplicate email returns error", async () => {
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email, // same email
        password: "AnotherPass123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  });

  // 3.2 Invalid tenant_id format
  await TestValidator.error(
    "invalid tenant_id format returns error",
    async () => {
      await api.functional.auth.organizationAdmin.join(connection, {
        body: {
          tenant_id: "invalid-uuid-format",
          email: `unique.${RandomGenerator.alphaNumeric(8)}@example.com`,
          password: "ValidPass123!",
          first_name: RandomGenerator.name(1),
          last_name: RandomGenerator.name(1),
        } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
      });
    },
  );

  // 3.3 Missing password prompts validation error
  await TestValidator.error("missing password returns error", async () => {
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: `missingpass.${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  });
}
