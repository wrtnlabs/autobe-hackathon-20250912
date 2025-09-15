import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Validate /auth/patient/refresh endpoint for session renewal and error
 * handling.
 *
 * Scenarios:
 *
 * 1. Authenticate with a valid patient to obtain a valid refresh token.
 * 2. Use that refresh token to request new tokens - expect success, validate field
 *    rotation.
 * 3. Attempt refresh with intentionally tampered/altered refresh token - expect
 *    error.
 * 4. Attempt with a random/expired token - expect error.
 * 5. Attempt with an empty token string - expect error and no tokens issued.
 */
export async function test_api_patient_token_refresh_with_valid_and_invalid_token(
  connection: api.IConnection,
) {
  // 1. Patient Login to obtain valid refresh token
  const patientEmail = RandomGenerator.alphaNumeric(10) + "@e2etest.com";
  const patientPassword = RandomGenerator.alphaNumeric(16);
  const patientLogin = {
    email: patientEmail,
    password: patientPassword,
  } satisfies IHealthcarePlatformPatient.ILogin;
  // Simulate patient registration (assume test DB/state allows direct login for new random accounts, or you pre-provision accounts in backend fixture)
  // Otherwise, real E2E would require a join/registration step.
  const auth = await api.functional.auth.patient.login(connection, {
    body: patientLogin,
  });
  typia.assert(auth);
  TestValidator.predicate(
    "refresh_token returned in login",
    typeof auth.refresh_token === "string" &&
      !!auth.refresh_token &&
      auth.refresh_token.length > 10,
  );
  const initialAccessToken = auth.token.access;
  const initialRefreshToken = auth.refresh_token!;

  // 2. Valid refresh
  const refreshBody = {
    refresh_token: initialRefreshToken,
  } satisfies IHealthcarePlatformPatient.IRefresh;
  const refreshed = await api.functional.auth.patient.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  TestValidator.predicate(
    "received new access token on refresh",
    typeof refreshed.token.access === "string" &&
      !!refreshed.token.access &&
      refreshed.token.access !== initialAccessToken,
  );
  TestValidator.predicate(
    "received refresh token on refresh",
    typeof refreshed.refresh_token === "string" && !!refreshed.refresh_token,
  );

  // 3. Error: Tampered refresh token
  const tamperedToken =
    initialRefreshToken.substring(0, initialRefreshToken.length - 2) +
    RandomGenerator.alphaNumeric(2);
  await TestValidator.error("refresh fails with tampered token", async () => {
    await api.functional.auth.patient.refresh(connection, {
      body: {
        refresh_token: tamperedToken,
      } satisfies IHealthcarePlatformPatient.IRefresh,
    });
  });

  // 4. Error: Random/Expired token
  const randomToken = RandomGenerator.alphaNumeric(32);
  await TestValidator.error(
    "refresh fails with random/expired token",
    async () => {
      await api.functional.auth.patient.refresh(connection, {
        body: {
          refresh_token: randomToken,
        } satisfies IHealthcarePlatformPatient.IRefresh,
      });
    },
  );

  // 5. Error: Empty token
  await TestValidator.error("refresh fails with empty token", async () => {
    await api.functional.auth.patient.refresh(connection, {
      body: { refresh_token: "" } satisfies IHealthcarePlatformPatient.IRefresh,
    });
  });
}
