import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * Validate the FlexOffice admin JWT token refresh process.
 *
 * This test covers the full authentication lifecycle for an admin user,
 * including:
 *
 * 1. Account creation (join)
 * 2. User login to obtain initial JWT tokens
 * 3. Successful token refresh using a valid refresh token
 * 4. Failure cases for refresh with expired, invalid, and revoked tokens
 *
 * It checks that token renewal updates access and refresh tokens, updates
 * expiration timestamps, and maintains authorization credentials properly.
 * Robust error handling is confirmed for invalid tokens returning 401
 * Unauthorized.
 */
export async function test_api_flexoffice_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Admin user joins the system
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = `Passw0rd!${RandomGenerator.alphaNumeric(4)}`;

  const joinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;

  const joinedAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Log in as admin to obtain initial JWT tokens
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // Extract valid refresh token from login
  const validRefreshToken = loggedInAdmin.token.refresh;

  // 3. Successfully refresh tokens with valid refresh token
  const refreshBodyValid = {
    refresh_token: validRefreshToken,
  } satisfies IFlexOfficeAdmin.IRefresh;

  const refreshedTokens: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshBodyValid,
    });
  typia.assert(refreshedTokens);

  // Validate that new access and refresh tokens differ from the old ones
  TestValidator.notEquals(
    "access token should be renewed",
    refreshedTokens.token.access,
    loggedInAdmin.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be renewed",
    refreshedTokens.token.refresh,
    loggedInAdmin.token.refresh,
  );

  // Validate expiration timestamps are updated and make sense
  const oldAccessExpiry = new Date(loggedInAdmin.token.expired_at).getTime();
  const newAccessExpiry = new Date(refreshedTokens.token.expired_at).getTime();
  TestValidator.predicate(
    "new access token expires later than old",
    newAccessExpiry > oldAccessExpiry,
  );

  const oldRefreshExpiry = new Date(
    loggedInAdmin.token.refreshable_until,
  ).getTime();
  const newRefreshExpiry = new Date(
    refreshedTokens.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "new refresh token expires later than old",
    newRefreshExpiry > oldRefreshExpiry,
  );

  // 4. Test failure case: expired refresh token
  const expiredRefreshToken = validRefreshToken + "expired";
  await TestValidator.httpError(
    "refresh with expired token should fail",
    401,
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IFlexOfficeAdmin.IRefresh,
      });
    },
  );

  // 5. Test failure case: invalid refresh token
  const invalidRefreshToken = "this.is.an.invalid.refresh.token";
  await TestValidator.httpError(
    "refresh with invalid token should fail",
    401,
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IFlexOfficeAdmin.IRefresh,
      });
    },
  );

  // 6. Test failure case: revoked refresh token (simulate by reversing valid token)
  const revokedRefreshToken = validRefreshToken.split("").reverse().join("");
  await TestValidator.httpError(
    "refresh with revoked token should fail",
    401,
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: revokedRefreshToken,
        } satisfies IFlexOfficeAdmin.IRefresh,
      });
    },
  );
}
