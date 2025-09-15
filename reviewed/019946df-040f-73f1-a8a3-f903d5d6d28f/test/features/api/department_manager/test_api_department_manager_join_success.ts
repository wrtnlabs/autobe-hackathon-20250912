import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

/**
 * Tests the end-to-end flow of creating a new department manager account.
 *
 * This test validates the creation of a new department manager account via
 * the join API and subsequent login. It checks that the account is properly
 * created with hashed password and that JWT tokens are issued. It also
 * verifies that duplicate email join attempts fail.
 *
 * Steps:
 *
 * 1. Generate realistic join data (email, password, first and last names).
 * 2. Call join API and assert the returned department manager structure.
 * 3. Validate that password is hashed and tokens are properly issued.
 * 4. Perform login with created credentials and validate returned tokens.
 * 5. Check that duplicate join calls with same email fail as expected.
 *
 * Invalid requests with missing required fields are skipped since
 * TypeScript typing prohibits sending such invalid bodies. Invalid tenant
 * association tests are skipped as the tenant is not part of the join
 * request.
 */
export async function test_api_department_manager_join_success(
  connection: api.IConnection,
) {
  // 1. Prepare department manager join data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const joinBody = {
    email,
    password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  // 2. Perform join API call
  const authorized: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 3. Validate returned data
  TestValidator.equals(
    "email matches join request",
    authorized.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "status is non-empty string",
    typeof authorized.status === "string" && authorized.status.length > 0,
  );
  TestValidator.predicate(
    "password hash differs from plaintext",
    authorized.password_hash !== joinBody.password,
  );
  TestValidator.predicate(
    "token access is non-empty",
    Boolean(authorized.token.access),
  );
  TestValidator.predicate(
    "token refresh is non-empty",
    Boolean(authorized.token.refresh),
  );
  TestValidator.predicate(
    "token expired_at is valid date",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is valid date",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );

  // 4. Perform login with same credentials
  const loginBody = {
    email,
    password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;
  const loggedIn: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 5. Validate login response
  TestValidator.equals("login email matches", loggedIn.email, joinBody.email);
  TestValidator.predicate(
    "login password hash differs from plaintext",
    loggedIn.password_hash !== joinBody.password,
  );
  TestValidator.predicate(
    "login token access is non-empty",
    Boolean(loggedIn.token.access),
  );
  TestValidator.predicate(
    "login token refresh is non-empty",
    Boolean(loggedIn.token.refresh),
  );

  // 6. Test duplicate join attempt fails with error
  await TestValidator.error("duplicate email join should fail", async () => {
    await api.functional.auth.departmentManager.join(connection, {
      body: joinBody,
    });
  });
}
