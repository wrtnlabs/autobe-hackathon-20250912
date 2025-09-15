import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E validation of HR recruiter login and authentication flow in the ATS
 * platform.
 *
 * - Registers a new HR recruiter via the join endpoint.
 * - Verifies successful login (valid email and password): returns valid JWT
 *   tokens and correct recruiter profile with is_active=true (no password
 *   in response).
 * - Validates login with incorrect password or non-existent email: ensures
 *   error thrown for invalid credentials.
 * - Simulates attempt to log in after recruiter is inactive (cannot automate
 *   status change, just describe behavior cannot be tested directly).
 * - Audit logging is NOT tested as theres no public endpoint to retrieve
 *   logs.
 * - Password hash is never exposed in any response.
 * - Token structure (access, refresh, expiry fields) is validated.
 * - The recruiter profile in the response must contain all expected fields
 *   and data integrity must be maintained.
 */
export async function test_api_hr_recruiter_login_success_invalid_credentials_inactive_account_and_audit_logging(
  connection: api.IConnection,
) {
  // Step 1: Register a new HR recruiter
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    department: RandomGenerator.name(1),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const joined = await api.functional.auth.hrRecruiter.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.predicate(
    "account should be active",
    joined.is_active === true,
  );
  TestValidator.equals(
    "profile email matches join input",
    joined.email,
    joinBody.email,
  );
  TestValidator.equals(
    "profile name matches join input",
    joined.name,
    joinBody.name,
  );
  TestValidator.equals(
    "profile department matches join input",
    joined.department,
    joinBody.department,
  );
  TestValidator.predicate(
    "access token exists",
    typeof joined.token.access === "string" && joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    typeof joined.token.refresh === "string" && joined.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiry is valid",
    typeof joined.token.expired_at === "string" &&
      joined.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until is valid",
    typeof joined.token.refreshable_until === "string" &&
      joined.token.refreshable_until.length > 0,
  );

  // Step 2: Attempt login with correct credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IAtsRecruitmentHrRecruiter.ILogin;
  const loggedIn = await api.functional.auth.hrRecruiter.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals("login result is active", loggedIn.is_active, true);
  TestValidator.equals(
    "login result email matches",
    loggedIn.email,
    joinBody.email,
  );
  TestValidator.equals(
    "login result department matches",
    loggedIn.department,
    joinBody.department,
  );
  // Password is never revealed in response
  TestValidator.predicate(
    "login result does not contain password",
    typeof (loggedIn as any).password === "undefined",
  );
  TestValidator.predicate(
    "JWT tokens exist in login result",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "JWT refresh token exists in login result",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is present",
    typeof loggedIn.token.expired_at === "string" &&
      loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until is present",
    typeof loggedIn.token.refreshable_until === "string" &&
      loggedIn.token.refreshable_until.length > 0,
  );

  // Step 3: Attempt login with WRONG password
  const wrongPasswordLogin = {
    email: joinBody.email,
    password: RandomGenerator.alphaNumeric(14),
  } satisfies IAtsRecruitmentHrRecruiter.ILogin;
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.auth.hrRecruiter.login(connection, {
      body: wrongPasswordLogin,
    });
  });

  // Step 4: Attempt login with email that does not exist
  const nonExistentLogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: joinBody.password,
  } satisfies IAtsRecruitmentHrRecruiter.ILogin;
  await TestValidator.error("login fails with unknown email", async () => {
    await api.functional.auth.hrRecruiter.login(connection, {
      body: nonExistentLogin,
    });
  });

  // Step 5: (Not Automatable) - Deactivate recruiter and test login denial
  // No API to deactivate or soft-delete a recruiter in provided spec, so this is not performed.
}
