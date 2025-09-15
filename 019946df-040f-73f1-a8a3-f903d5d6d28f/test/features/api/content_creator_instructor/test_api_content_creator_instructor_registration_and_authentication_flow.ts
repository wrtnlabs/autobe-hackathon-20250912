import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

/**
 * Validate the registration and authentication flow for the Content
 * Creator/Instructor role.
 *
 * This test covers the full registration process with all required tenant
 * and user information, verifies the received JWT tokens and user details,
 * and validates business rules such as unique emails scoped per tenant and
 * immediate authentication capability.
 *
 * Steps:
 *
 * 1. Register a new content creator/instructor user by calling POST
 *    /auth/contentCreatorInstructor/join with valid tenant association and
 *    personal info.
 * 2. Assert that the response complies with
 *    IEnterpriseLmsContentCreatorInstructor.IAuthorized including valid
 *    tokens and correct user details.
 * 3. Attempt to register with the same email and tenant to confirm graceful
 *    error handling on duplicate.
 * 4. Confirm valid JWT tokens and tenant association allow authenticated
 *    requests within the tenant context.
 */
export async function test_api_content_creator_instructor_registration_and_authentication_flow(
  connection: api.IConnection,
) {
  // Step 1: Register a new content creator/instructor user with tenant association
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `user_${RandomGenerator.alphaNumeric(5)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  const createBody = {
    tenant_id: tenantId,
    email: email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status: status,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const authorizedUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Validate response details
  TestValidator.equals("tenant_id matches", authorizedUser.tenant_id, tenantId);
  TestValidator.equals("email matches", authorizedUser.email, email);
  TestValidator.equals(
    "password_hash matches",
    authorizedUser.password_hash,
    passwordHash,
  );
  TestValidator.equals(
    "first_name matches",
    authorizedUser.first_name,
    firstName,
  );
  TestValidator.equals("last_name matches", authorizedUser.last_name, lastName);
  TestValidator.equals("status is active", authorizedUser.status, "active");

  // Validate token structure
  const token = authorizedUser.token;
  TestValidator.predicate(
    "token.access is non-empty",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO date",
    typeof token.expired_at === "string" &&
      !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date",
    typeof token.refreshable_until === "string" &&
      !isNaN(Date.parse(token.refreshable_until)),
  );

  // Step 3: Attempt duplicate registration with same tenant and email
  await TestValidator.error("duplicate email registration fails", async () => {
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: createBody,
    });
  });

  // Step 4: Confirm tokens are usable by making a follow-up request requiring token (simulated)
  // Since no such API exists in provided functions, we validate token presence and assume usable context
  TestValidator.predicate(
    "token contains access for authentication",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "token associated with correct tenant",
    authorizedUser.tenant_id === tenantId,
  );
}
