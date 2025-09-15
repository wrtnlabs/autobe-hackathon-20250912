import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate applicant session token refresh and its rejection on
 * invalid/expired/inactive scenarios
 *
 * Test three scenarios:
 *
 * 1. After successful join and login as applicant, refresh with valid token. The
 *    API must return new access and refresh tokens, and applicant info.
 * 2. Refresh with an intentionally broken/expired token: Should yield an error and
 *    not issue tokens.
 * 3. Attempt refresh after applicant becomes invalid/inactive (simulate as much as
 *    is possible via API): Refresh attempt must fail.
 *
 * Steps:
 *
 * 1. Register a new applicant
 * 2. Login as that applicant to obtain token
 * 3. Refresh with the valid token (expect new tokens and valid applicant info)
 * 4. Refresh with mutated/invalid token (expect failure)
 * 5. Simulate previous refresh token invalidation by reusing the old token (should
 *    yield error after refresh)
 */
export async function test_api_applicant_refresh_token_validity_and_expiry(
  connection: api.IConnection,
) {
  // 1. Register a new applicant
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IAtsRecruitmentApplicant.ICreate;

  const joinResult = await api.functional.auth.applicant.join(connection, {
    body: createBody,
  });
  typia.assert(joinResult);

  // 2. Login as the applicant
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IAtsRecruitmentApplicant.ILogin;

  const loginResult = await api.functional.auth.applicant.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // 3. Scenario 1: Refresh with a valid refresh token
  const refreshBody = {
    refresh_token: loginResult.token.refresh,
  } satisfies IAtsRecruitmentApplicant.IRefresh;

  const refreshResult = await api.functional.auth.applicant.refresh(
    connection,
    {
      body: refreshBody,
    },
  );
  typia.assert(refreshResult);
  // tokens must be replaced
  TestValidator.notEquals(
    "refresh access token has changed",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "refresh refresh token has changed",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );
  // applicant info is consistent
  TestValidator.equals(
    "refreshed applicant id matches",
    refreshResult.id,
    loginResult.id,
  );
  TestValidator.equals(
    "refreshed applicant email matches",
    refreshResult.email,
    loginResult.email,
  );
  TestValidator.equals(
    "refreshed applicant name matches",
    refreshResult.name,
    loginResult.name,
  );
  TestValidator.equals(
    "refreshed applicant phone matches",
    refreshResult.phone,
    loginResult.phone,
  );

  // 4. Scenario 2: Refresh with an intentionally broken/invalid token
  const invalidRefreshToken =
    loginResult.token.refresh.slice(0, -1) +
    RandomGenerator.pick([..."abcdef0123456789"]);
  const invalidRefreshBody = {
    refresh_token: invalidRefreshToken,
  } satisfies IAtsRecruitmentApplicant.IRefresh;
  await TestValidator.error(
    "refresh with invalid refresh token yields error",
    async () => {
      await api.functional.auth.applicant.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );

  // 5. Scenario 3: Reuse previous valid token after refresh (should now be invalid)
  await TestValidator.error(
    "refresh with used refresh token yields error",
    async () => {
      await api.functional.auth.applicant.refresh(connection, {
        body: refreshBody,
      });
    },
  );
}
