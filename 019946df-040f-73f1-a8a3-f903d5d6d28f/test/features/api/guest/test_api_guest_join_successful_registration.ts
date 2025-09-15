import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

/**
 * Validate the successful registration of a new guest user account.
 *
 * This test performs a full guest user join operation by sending a
 * well-formed request to the POST /auth/guest/join endpoint. It includes
 * all required fields for the guest user creation, such as tenant ID,
 * email, hashed password, first and last names, and account status.
 *
 * After registration, the test validates the response to ensure the guest
 * user is authorized, receiving valid JWT tokens and user information that
 * matches the requested values. This confirms correct business logic
 * including tenant isolation, secure password handling, and token
 * issuance.
 *
 * Validation points:
 *
 * - Request body includes all required properties with valid values
 * - Response matches IEnterpriseLmsGuest.IAuthorized schema
 * - Returned tenant ID, email, names, status equal request values
 * - Token object contains non-empty access and refresh tokens
 * - Token expiration fields are valid ISO 8601 date-time strings
 */
export async function test_api_guest_join_successful_registration(
  connection: api.IConnection,
) {
  // Create a valid guest user registration request body with all required properties
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordHash: string = RandomGenerator.alphaNumeric(64); // Simulate hashed password
  const firstName: string = RandomGenerator.name(1);
  const lastName: string = RandomGenerator.name(1);
  const status: string = "active"; // Use 'active' as standard guest account status

  const requestBody = {
    tenant_id: tenantId,
    email: email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status: status,
  } satisfies IEnterpriseLmsGuest.ICreate;

  // Execute guest join API call
  const authorized: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // Validate correctness of response data
  typia.assert(authorized);

  TestValidator.equals(
    "tenant_id matches input",
    authorized.tenant_id,
    tenantId,
  );
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals(
    "first_name matches input",
    authorized.first_name,
    firstName,
  );
  TestValidator.equals(
    "last_name matches input",
    authorized.last_name,
    lastName,
  );
  TestValidator.equals("status matches input", authorized.status, status);

  TestValidator.predicate(
    "token access token is non-empty",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh token is non-empty",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is ISO string",
    typeof authorized.token.expired_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(authorized.token.expired_at),
  );
  TestValidator.predicate(
    "token refreshable_until is ISO string",
    typeof authorized.token.refreshable_until === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(authorized.token.refreshable_until),
  );
}
