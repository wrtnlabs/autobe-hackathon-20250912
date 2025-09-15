import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";

/**
 * This end-to-end test validates the login operation for corporate learner
 * users.
 *
 * It performs user registration via the join endpoint and then tests login
 * success with correct credentials, as well as login failure cases with wrong
 * password and non-existent email. This ensures proper authentication handling
 * in a multi-tenant Enterprise LMS environment.
 */
export async function test_api_corporate_learner_login_success_and_failure(
  connection: api.IConnection,
) {
  // Step 1. Generate tenant ID
  const tenantId = typia.random<string & tags.Format<"uuid">>();

  // Step 2. Create new corporate learner via join API
  const createBody = {
    tenant_id: tenantId,
    email: `user_${RandomGenerator.alphaNumeric(6)}@company.com`,
    password: "StrongP@ssw0rd",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const createdUser = await api.functional.auth.corporateLearner.join(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(createdUser);

  TestValidator.equals(
    "created user's tenant id matches",
    createdUser.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "created user's email matches",
    createdUser.email,
    createBody.email,
  );

  // Step 3. Login with correct credentials
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loginResult = await api.functional.auth.corporateLearner.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loginResult);

  TestValidator.equals(
    "login user id matches created user id",
    loginResult.id,
    createdUser.id,
  );
  TestValidator.equals(
    "login token access is string",
    typeof loginResult.token.access,
    "string",
  );
  TestValidator.equals(
    "login token refresh is string",
    typeof loginResult.token.refresh,
    "string",
  );

  // Step 4. Login failure: wrong password
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.auth.corporateLearner.login(connection, {
      body: {
        email: createBody.email,
        password: "WrongPassword123!",
      } satisfies IEnterpriseLmsCorporateLearner.ILogin,
    });
  });

  // Step 5. Login failure: non-existent email
  await TestValidator.error("login fails with non-existent email", async () => {
    await api.functional.auth.corporateLearner.login(connection, {
      body: {
        email: `nonexistent_${RandomGenerator.alphaNumeric(6)}@company.com`,
        password: "StrongP@ssw0rd",
      } satisfies IEnterpriseLmsCorporateLearner.ILogin,
    });
  });
}
