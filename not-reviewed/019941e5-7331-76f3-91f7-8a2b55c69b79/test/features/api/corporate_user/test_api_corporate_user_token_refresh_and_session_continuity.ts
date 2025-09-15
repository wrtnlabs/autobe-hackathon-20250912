import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignCorporateUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignCorporateUser";

export async function test_api_corporate_user_token_refresh_and_session_continuity(
  connection: api.IConnection,
) {
  // 1. Corporate user login to get authorization info
  const loginBody = {
    email: `user${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "validpassword123",
  } satisfies IEasySignCorporateUser.ILogin;

  const authorized: IEasySignCorporateUser.IAuthorized =
    await api.functional.auth.corporateUser.login(connection, {
      body: loginBody,
    });
  typia.assert(authorized);

  // 2. Validate presence of tokens
  TestValidator.predicate(
    "access token is a string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // 3. Use refresh token to request new tokens
  const refreshBody = {
    refreshToken: authorized.token.refresh,
  } satisfies IEasySignCorporateUser.IRefresh;

  const refreshed: IEasySignCorporateUser.IAuthorized =
    await api.functional.auth.corporateUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 4. Validate that new tokens are present and differ from old tokens
  TestValidator.predicate(
    "new access token differs from old",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access !== authorized.token.access &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token differs from old",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh !== authorized.token.refresh &&
      refreshed.token.refresh.length > 0,
  );

  // 5. Validate that expiry timestamps are valid ISO strings and logically consistent
  const expiredAtOld = new Date(authorized.token.expired_at);
  const expiredAtNew = new Date(refreshed.token.expired_at);
  const refreshableUntilOld = new Date(authorized.token.refreshable_until);
  const refreshableUntilNew = new Date(refreshed.token.refreshable_until);

  TestValidator.predicate(
    "old expired_at is valid date",
    !isNaN(expiredAtOld.getTime()),
  );
  TestValidator.predicate(
    "new expired_at is valid date",
    !isNaN(expiredAtNew.getTime()),
  );
  TestValidator.predicate(
    "old refreshable_until is valid date",
    !isNaN(refreshableUntilOld.getTime()),
  );
  TestValidator.predicate(
    "new refreshable_until is valid date",
    !isNaN(refreshableUntilNew.getTime()),
  );

  TestValidator.predicate(
    "new expired_at is later than old expired_at",
    expiredAtNew > expiredAtOld,
  );

  TestValidator.predicate(
    "new refreshable_until is later than old refreshable_until",
    refreshableUntilNew > refreshableUntilOld,
  );

  // 6. Assert business data consistency for corporate user info
  TestValidator.equals(
    "user ids are identical between login and refresh",
    refreshed.id,
    authorized.id,
  );
  TestValidator.equals(
    "user emails are identical between login and refresh",
    refreshed.email,
    authorized.email,
  );
  TestValidator.equals(
    "user company names are identical between login and refresh",
    refreshed.company_name,
    authorized.company_name,
  );

  // 7. Negative tests: attempt refresh with an invalid refresh token (random string)
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.corporateUser.refresh(connection, {
        body: {
          refreshToken: RandomGenerator.alphaNumeric(40),
        } satisfies IEasySignCorporateUser.IRefresh,
      });
    },
  );

  // 8. Negative test: attempt refresh with empty refresh token
  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await api.functional.auth.corporateUser.refresh(connection, {
        body: {
          refreshToken: "",
        } satisfies IEasySignCorporateUser.IRefresh,
      });
    },
  );
}
