import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";

/**
 * End-to-end test for medical doctor token refresh API.
 *
 * 1. Register a new doctor (random business email, name, NPI, password).
 * 2. Log in to receive initial access/refresh tokens.
 * 3. Use the refresh endpoint to obtain new tokens. Assert structure and business
 *    rules: (a) Basic profile fields stay the same (email, NPI, id, name,
 *    specialty, phone). (b) token.access and token.refresh are different from
 *    previous login. (c) refreshable_until is extended. (d) password is never
 *    exposed.
 * 4. Attempt refresh with an invalid token; expect failure (TestValidator.error).
 *
 * Steps use only valid DTO types. All sensitive fields are checked for secure
 * handling.
 */
export async function test_api_medical_doctor_token_refresh_flow(
  connection: api.IConnection,
) {
  // 1. Doctor registration
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(16),
    specialty: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const joined = await api.functional.auth.medicalDoctor.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);

  // 2. Login with registered credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformMedicalDoctor.ILogin;
  const loggedIn = await api.functional.auth.medicalDoctor.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);

  // 3. Refresh with valid refresh token
  const refreshReq = {
    refresh_token: loggedIn.token.refresh,
  } satisfies IHealthcarePlatformMedicalDoctor.IRefresh;
  const refreshed = await api.functional.auth.medicalDoctor.refresh(
    connection,
    { body: refreshReq },
  );
  typia.assert(refreshed);
  // Validate fields remain equal (except tokens)
  TestValidator.equals("id stable", refreshed.id, loggedIn.id);
  TestValidator.equals("email stable", refreshed.email, loggedIn.email);
  TestValidator.equals("npi stable", refreshed.npi_number, loggedIn.npi_number);
  TestValidator.equals(
    "specialty stable",
    refreshed.specialty,
    loggedIn.specialty,
  );
  TestValidator.equals("phone stable", refreshed.phone, loggedIn.phone);
  TestValidator.notEquals(
    "access tokens differ",
    refreshed.token.access,
    loggedIn.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens differ",
    refreshed.token.refresh,
    loggedIn.token.refresh,
  );
  TestValidator.predicate(
    "refreshable_until extended",
    new Date(refreshed.token.refreshable_until) >
      new Date(loggedIn.token.refreshable_until),
  );
  TestValidator.equals(
    "no password leakage",
    Object.prototype.hasOwnProperty.call(refreshed, "password"),
    false,
  );

  // 4. Attempt refresh with invalid/altered refresh token
  const badReq = {
    refresh_token: loggedIn.token.refresh + "invalid",
  } satisfies IHealthcarePlatformMedicalDoctor.IRefresh;
  await TestValidator.error(
    "refresh with invalid token is denied",
    async () => {
      await api.functional.auth.medicalDoctor.refresh(connection, {
        body: badReq,
      });
    },
  );
}
