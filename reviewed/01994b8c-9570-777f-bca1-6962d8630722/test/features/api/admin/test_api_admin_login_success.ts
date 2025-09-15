import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianAdmin";

export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // 1. Admin registration via join API
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64) satisfies string;

  const admin: ISubscriptionRenewalGuardianAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
      } satisfies ISubscriptionRenewalGuardianAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Successful login with correct credentials
  const loginResponse: ISubscriptionRenewalGuardianAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
      } satisfies ISubscriptionRenewalGuardianAdmin.ILogin,
    });
  typia.assert(loginResponse);

  // Validate returned tokens are correct type and structure
  TestValidator.predicate(
    "loginResponse.token.access is a non-empty string",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "loginResponse.token.refresh is a non-empty string",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "loginResponse.token.expired_at is ISO string",
    typeof loginResponse.token.expired_at === "string" &&
      loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "loginResponse.token.refreshable_until is ISO string",
    typeof loginResponse.token.refreshable_until === "string" &&
      loginResponse.token.refreshable_until.length > 0,
  );

  // 3. Failure scenario: Incorrect password
  await TestValidator.error("login fails with incorrect password", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password_hash: RandomGenerator.alphaNumeric(64) satisfies string, // random wrong password
      } satisfies ISubscriptionRenewalGuardianAdmin.ILogin,
    });
  });

  // 4. Failure scenario: Non-existent email
  await TestValidator.error("login fails with non-existent email", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: passwordHash,
      } satisfies ISubscriptionRenewalGuardianAdmin.ILogin,
    });
  });
}
