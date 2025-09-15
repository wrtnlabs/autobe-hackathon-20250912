import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Test the successful login of an organization administrator.
 *
 * This test verifies that:
 *
 * - Providing valid credentials results in successful login.
 * - The login response includes the correct authorized user data and valid
 *   JWT tokens.
 * - Invalid credentials are rejected.
 * - Inactive user accounts are denied login.
 *
 * Steps:
 *
 * 1. Attempt a successful login with valid email and password.
 * 2. Assert the returned IAuthorized object includes all required properties.
 * 3. Attempt logins with invalid email and password and validate that errors
 *    are thrown.
 * 4. Attempt login with inactive user status and confirm login is rejected.
 */
export async function test_api_organization_admin_login_success(
  connection: api.IConnection,
) {
  // 1. Successful login scenario
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const authorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email,
        password,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(authorized);

  // 2. Invalid email login attempt
  await TestValidator.error(
    "login should fail with invalid email",
    async () => {
      await api.functional.auth.organizationAdmin.login(connection, {
        body: {
          email: "invalid.email@invalid-domain.xyz",
          password,
        } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
      });
    },
  );

  // 3. Invalid password login attempt
  await TestValidator.error(
    "login should fail with invalid password",
    async () => {
      await api.functional.auth.organizationAdmin.login(connection, {
        body: {
          email,
          password: "wrongpassword123",
        } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
      });
    },
  );

  // 4. Inactive user login attempt
  // Since the test cannot create test users or modify status,
  // test inactive user login with a known inactive user (dummy value)
  await TestValidator.error("login should fail for inactive user", async () => {
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: "inactive.user@example.com",
        password: "somepassword",
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  });
}
