import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Test successful refresh of nurse authentication tokens.
 *
 * This test verifies the scenario where a nurse user with a valid refresh token
 * successfully requests new tokens.
 *
 * - Register and login a nurse account to establish credentials and obtain the
 *   initial refresh token.
 * - Call /auth/nurse/refresh using the valid refresh token and check that new
 *   tokens and profile data are returned correctly.
 * - Assert all business-critical user fields, token structure, and continuity of
 *   session.
 * - Validate that no sensitive authentication details are present in the
 *   response.
 * - Ensures DTO contract type safety and business reality.
 */
export async function test_api_nurse_refresh_token_success(
  connection: api.IConnection,
) {
  // 1. Register a new nurse
  const nurseEmail =
    RandomGenerator.name(1).replace(/\s/g, "") + "@hospital.com";
  const nursePassword = RandomGenerator.alphaNumeric(12);
  const nurseFullName = RandomGenerator.name();
  const nurseLicenseNumber = RandomGenerator.alphaNumeric(10);
  const nurseSpecialty = RandomGenerator.name(1);
  const nursePhone = RandomGenerator.mobile();

  const joinBody = {
    email: nurseEmail,
    full_name: nurseFullName,
    license_number: nurseLicenseNumber,
    specialty: nurseSpecialty,
    phone: nursePhone,
    password: nursePassword,
  } satisfies IHealthcarePlatformNurse.IJoin;

  const joined = await api.functional.auth.nurse.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals(
    "nurse email after join matches input",
    joined.email,
    nurseEmail,
  );
  TestValidator.equals(
    "nurse license_number after join matches input",
    joined.license_number,
    nurseLicenseNumber,
  );
  TestValidator.equals("joined user is not deleted", joined.deleted_at, null);
  TestValidator.predicate(
    "joined user token has access token",
    typeof joined.token.access === "string" && joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined user token has refresh token",
    typeof joined.token.refresh === "string" && joined.token.refresh.length > 0,
  );

  // 2. Login as the nurse to get refresh token
  const loginBody = {
    email: nurseEmail,
    password: nursePassword,
  } satisfies IHealthcarePlatformNurse.ILogin;
  const loggedIn = await api.functional.auth.nurse.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "login response email matches registered",
    loggedIn.email,
    nurseEmail,
  );
  TestValidator.equals(
    "login response license_number matches registered",
    loggedIn.license_number,
    nurseLicenseNumber,
  );
  TestValidator.predicate(
    "login user token has refresh token",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );
  const refreshToken = loggedIn.token.refresh;

  // 3. Call /auth/nurse/refresh with valid refresh_token
  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies IHealthcarePlatformNurse.IRefresh;
  const refreshed = await api.functional.auth.nurse.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshed);

  // Confirm profile matches original
  TestValidator.equals(
    "refreshed id same as registered",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "refreshed email same as registered",
    refreshed.email,
    nurseEmail,
  );
  TestValidator.equals(
    "refreshed license_number same as registered",
    refreshed.license_number,
    nurseLicenseNumber,
  );
  TestValidator.equals(
    "refreshed full_name same as registered",
    refreshed.full_name,
    nurseFullName,
  );
  TestValidator.equals(
    "refreshed specialty same as registered",
    refreshed.specialty,
    nurseSpecialty,
  );
  TestValidator.equals(
    "refreshed phone same as registered",
    refreshed.phone,
    nursePhone,
  );
  TestValidator.equals(
    "refreshed deleted_at is null (active user)",
    refreshed.deleted_at,
    null,
  );
  TestValidator.predicate(
    "refreshed token contains a new access token",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed token contains a new refresh token",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed token expired_at date-time format",
    typeof refreshed.token.expired_at === "string" &&
      refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed token refreshable_until date-time format",
    typeof refreshed.token.refreshable_until === "string" &&
      refreshed.token.refreshable_until.length > 0,
  );
  // Sensitive details validation (no password/info)
  TestValidator.predicate(
    "no plain text password field in refreshed nurse response",
    !Object.keys(refreshed).includes("password"),
  );
}
