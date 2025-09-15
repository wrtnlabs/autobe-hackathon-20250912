import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * Test for successful FlexOffice admin login.
 *
 * 1. Create admin user by joining with unique email and password.
 * 2. Login with correct email and password, verifying successful authentication.
 * 3. Attempt login with invalid email expecting failure.
 * 4. Attempt login with wrong password expecting failure.
 * 5. Validate returned JWT tokens include access and refresh with correct
 *    expiration order.
 */
export async function test_api_flexoffice_admin_login_success(
  connection: api.IConnection,
) {
  // 1. Create admin user via join endpoint
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword123!";

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Test successful login using correct credentials
  const loginPayload = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loginResult: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginPayload,
    });
  typia.assert(loginResult);
  TestValidator.equals("admin login id matches", loginResult.id, admin.id);

  // 3. Test failure login: wrong email (not found)
  await TestValidator.error("login fails with non-existent email", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: "nonexistent" + adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  });

  // 4. Test failure login: wrong password
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "WrongPass123!",
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  });

  // 5. Verify issued tokens have correct fields and reasonable expiration
  const token = loginResult.token;
  TestValidator.predicate("access token is non-empty", token.access.length > 0);
  TestValidator.predicate(
    "refresh token is non-empty",
    token.refresh.length > 0,
  );
  try {
    new Date(token.expired_at);
    new Date(token.refreshable_until);
  } catch {
    throw new Error("Token expiration fields must be valid ISO date strings");
  }
  TestValidator.predicate(
    "access expired before refresh token",
    new Date(token.expired_at) < new Date(token.refreshable_until),
  );
}
