import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Test successful nurse login.
 *
 * This test covers the entire business flow of nurse login. It first
 * registers a nurse using the join endpoint with valid business credentials
 * (email, full name, license number, and required password). The test then
 * performs a login immediately using the same credentials. It validates
 * that the JWT tokens are present, nurse profile matches registration
 * information (email, full_name, license_number, etc.), and the account is
 * not soft-deleted (deleted_at is null/undefined). This confirms both the
 * happy path for authentication and basic session initialization.
 */
export async function test_api_nurse_login_success(
  connection: api.IConnection,
) {
  // Step 1: Generate nurse registration info (business email, license)
  const nurseEmail = `nurse.${RandomGenerator.alphaNumeric(8)}@hospital-example.com`;
  const nursePassword = RandomGenerator.alphaNumeric(12);
  const nurseFullName = RandomGenerator.name();
  const nurseLicense = `LIC${RandomGenerator.alphaNumeric(10).toUpperCase()}`;

  // Step 2: Register the nurse
  const joinBody = {
    email: nurseEmail,
    full_name: nurseFullName,
    license_number: nurseLicense,
    password: nursePassword,
    // specialty and phone are optional, skip for this test
  } satisfies IHealthcarePlatformNurse.IJoin;
  const joinResult = await api.functional.auth.nurse.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResult);

  // Check core fields match
  TestValidator.equals(
    "join response - email matches",
    joinResult.email,
    nurseEmail,
  );
  TestValidator.equals(
    "join response - full_name matches",
    joinResult.full_name,
    nurseFullName,
  );
  TestValidator.equals(
    "join response - license_number matches",
    joinResult.license_number,
    nurseLicense,
  );
  TestValidator.equals(
    "join response - deleted_at should be null or undefined",
    joinResult.deleted_at ?? null,
    null,
  );

  // Step 3: Perform login with the same credentials
  const loginBody = {
    email: nurseEmail,
    password: nursePassword,
  } satisfies IHealthcarePlatformNurse.ILogin;
  const loginResult = await api.functional.auth.nurse.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // Validate returned profile and token
  TestValidator.equals(
    "login response - id should match join id",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.equals(
    "login response - email matches login (lowercase)",
    loginResult.email.toLowerCase(),
    nurseEmail.toLowerCase(),
  );
  TestValidator.equals(
    "login response - full_name matches",
    loginResult.full_name,
    nurseFullName,
  );
  TestValidator.equals(
    "login response - license_number matches",
    loginResult.license_number,
    nurseLicense,
  );
  TestValidator.equals(
    "login response - deleted_at should be null or undefined",
    loginResult.deleted_at ?? null,
    null,
  );

  // Tokens checks
  TestValidator.predicate(
    "login token.access is non-empty string",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token.refresh is non-empty string",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login token.expired_at is ISO date string",
    typeof loginResult.token.expired_at === "string" &&
      loginResult.token.expired_at.includes("T"),
  );
  TestValidator.predicate(
    "login token.refreshable_until is ISO date string",
    typeof loginResult.token.refreshable_until === "string" &&
      loginResult.token.refreshable_until.includes("T"),
  );
}
