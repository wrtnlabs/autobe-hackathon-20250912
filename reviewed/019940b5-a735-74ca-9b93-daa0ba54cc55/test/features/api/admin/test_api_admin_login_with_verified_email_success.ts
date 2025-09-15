import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";

export async function test_api_admin_login_with_verified_email_success(
  connection: api.IConnection,
) {
  // 1. Create admin user with verified email
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminAuthorized: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // Validate that email is verified and matches input
  TestValidator.predicate(
    "admin email is verified",
    adminAuthorized.email_verified,
  );
  TestValidator.equals(
    "admin email matches input",
    adminAuthorized.email,
    adminCreateBody.email,
  );

  // 2. Login with the created admin's credentials
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const adminLoginResponse: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResponse);

  // Validate login response tokens and user info
  TestValidator.predicate(
    "login tokens have access and refresh",
    typeof adminLoginResponse.token.access === "string" &&
      typeof adminLoginResponse.token.refresh === "string",
  );
  TestValidator.predicate(
    "token expiry dates are valid ISO",
    typeof adminLoginResponse.token.expired_at === "string" &&
      typeof adminLoginResponse.token.refreshable_until === "string",
  );
  TestValidator.equals(
    "login email matches created admin email",
    adminLoginResponse.email,
    adminCreateBody.email,
  );
  TestValidator.predicate(
    "login email is verified",
    adminLoginResponse.email_verified,
  );
}
