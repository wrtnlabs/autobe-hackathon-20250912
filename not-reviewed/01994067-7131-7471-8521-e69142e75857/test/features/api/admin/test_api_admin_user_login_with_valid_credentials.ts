import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";

export async function test_api_admin_user_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Create a new admin user by calling the admin join endpoint
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password1 = "StrongPassword123!";
  const joinBody = {
    email: email,
    email_verified: true,
    password: password1,
  } satisfies IOauthServerAdmin.ICreate;
  const joinedAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(joinedAdmin);

  // Validate the join response
  TestValidator.equals("admin email after join", joinedAdmin.email, email);
  TestValidator.predicate(
    "email verified after join",
    joinedAdmin.email_verified === true,
  );

  // 2. Perform admin login with correct credentials
  const loginBody = {
    email: email,
    password: password1,
  } satisfies IOauthServerAdmin.ILogin;
  const loggedInAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loggedInAdmin);

  // Validate the login response
  TestValidator.equals("admin email after login", loggedInAdmin.email, email);
  TestValidator.predicate(
    "email verified after login",
    loggedInAdmin.email_verified === true,
  );

  // Validate that login returns a valid token structure
  TestValidator.predicate(
    "token has access string",
    typeof loggedInAdmin.token.access === "string" &&
      loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh string",
    typeof loggedInAdmin.token.refresh === "string" &&
      loggedInAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expired_at date-time",
    typeof loggedInAdmin.token.expired_at === "string" &&
      loggedInAdmin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refreshable_until date-time",
    typeof loggedInAdmin.token.refreshable_until === "string" &&
      loggedInAdmin.token.refreshable_until.length > 0,
  );
}
