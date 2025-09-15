import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate lifecycle and security controls of the HR recruiter token
 * refresh workflow. This includes happy path, tampered/invalid token
 * denial, and token rotation.
 *
 * Steps:
 *
 * 1. Register recruiter (join)
 * 2. Login to obtain valid refresh token
 * 3. Refresh tokens using the valid refresh token
 *
 *    - Validate new tokens are distinct from previous
 *    - Profile fields should update if changed (test not feasible: no profile
 *         edit API)
 * 4. Refresh with a tampered token (alter content)
 *
 *    - Should throw error/no tokens issued
 * 5. Refresh with a random-characters/garbage token
 *
 *    - Should throw error/no tokens issued
 * 6. Attempt refresh as if account was deactivated or deleted
 *
 *    - Not possible to simulate via public API, so acknowledge as commentary
 *
 * Validation: Assert tokens before and after differ, all responses pass
 * typia.assert, errors are thrown as expected.
 */
export async function test_api_hr_recruiter_refresh_token_lifecycle_and_security_controls(
  connection: api.IConnection,
) {
  // 1. Register recruiter
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    department: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const registered = await api.functional.auth.hrRecruiter.join(connection, {
    body: joinBody,
  });
  typia.assert(registered);

  // 2. Login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IAtsRecruitmentHrRecruiter.ILogin;
  const loggedIn = await api.functional.auth.hrRecruiter.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "logged-in user ID matches joined",
    loggedIn.id,
    registered.id,
  );
  TestValidator.equals(
    "email matches registration",
    loggedIn.email,
    joinBody.email,
  );

  // 3. Refresh with valid refresh token
  const refreshBody = {
    refreshToken: loggedIn.token.refresh,
  } satisfies IAtsRecruitmentHrRecruiter.IRefresh;
  const refreshed = await api.functional.auth.hrRecruiter.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  TestValidator.equals("refreshed recruiter ID", refreshed.id, registered.id);
  TestValidator.notEquals(
    "access token should rotate",
    refreshed.token.access,
    loggedIn.token.access,
  );
  TestValidator.notEquals(
    "refresh token should rotate",
    refreshed.token.refresh,
    loggedIn.token.refresh,
  );

  // 4. Tampered Token Error
  const tamperedToken =
    loggedIn.token.refresh.substring(0, loggedIn.token.refresh.length - 1) +
    RandomGenerator.pick([
      ..."0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    ]);
  const tamperedBody = {
    refreshToken: tamperedToken,
  } satisfies IAtsRecruitmentHrRecruiter.IRefresh;
  await TestValidator.error(
    "server rejects tampered refresh token",
    async () => {
      await api.functional.auth.hrRecruiter.refresh(connection, {
        body: tamperedBody,
      });
    },
  );

  // 5. Garbage/invalid token
  const garbageBody = {
    refreshToken: RandomGenerator.alphaNumeric(50),
  } satisfies IAtsRecruitmentHrRecruiter.IRefresh;
  await TestValidator.error(
    "server rejects random/invalid refresh token",
    async () => {
      await api.functional.auth.hrRecruiter.refresh(connection, {
        body: garbageBody,
      });
    },
  );

  // 6. Attempting refresh after deactivation or deletion (not possible via API)
  // - As we cannot inactivate/delete via public endpoints, acknowledge as comment:
  //   If a recruiter is deactivated, refresh must be denied. This is untestable directly.
}
