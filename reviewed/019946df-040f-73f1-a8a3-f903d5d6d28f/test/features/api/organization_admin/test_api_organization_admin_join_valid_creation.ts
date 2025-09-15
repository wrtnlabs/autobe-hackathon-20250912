import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_organization_admin_join_valid_creation(
  connection: api.IConnection,
) {
  // 1. Prepare valid create request data with all required fields
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(12);

  const createBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  // 2. Call the join API
  const response = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: createBody },
  );

  // 3. Assert the response structure and types comprehensively
  typia.assert(response);

  // 4. Verify response fields match the input request where applicable
  TestValidator.equals("tenant_id matches", response.tenant_id, tenantId);
  TestValidator.equals("email matches", response.email, email);
  TestValidator.equals("first_name matches", response.first_name, firstName);
  TestValidator.equals("last_name matches", response.last_name, lastName);

  // 5. Validate non-null status and password_hash presence (not raw password)
  TestValidator.predicate(
    "status is non-empty string",
    typeof response.status === "string" && response.status.length > 0,
  );
  TestValidator.predicate(
    "password_hash is non-empty string",
    typeof response.password_hash === "string" &&
      response.password_hash.length > 0,
  );

  // 6. Validate created_at and updated_at are ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof response.created_at === "string" && response.created_at.length >= 20,
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof response.updated_at === "string" && response.updated_at.length >= 20,
  );

  // 7. Confirm deleted_at is null or undefined explicitly, expected null on creation
  if (response.deleted_at !== undefined) {
    TestValidator.equals(
      "deleted_at is null on new account",
      response.deleted_at,
      null,
    );
  }

  // 8. Validate token object has all required string fields
  const token = response.token;
  TestValidator.predicate(
    "token.access is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO 8601 date-time",
    typeof token.expired_at === "string" && token.expired_at.length >= 20,
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO 8601 date-time",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length >= 20,
  );
}
