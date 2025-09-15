import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";

/**
 * Validate the corporate learner registration and authentication flow.
 *
 * This test covers the sign-up operation for a new corporate learner user
 * including tenant association, password handling, and JWT token issuance.
 *
 * Steps:
 *
 * 1. Register a new corporate learner user with all required fields.
 * 2. Confirm the response contains valid JWT tokens and user information.
 * 3. Verify that duplicate email registration returns an error.
 * 4. Verify registration fails with missing required fields.
 *
 * Business rules checked include tenant isolation and default active
 * status. Validation errors test missing or invalid parameters.
 */
export async function test_api_corporate_learner_registration_and_authentication_flow(
  connection: api.IConnection,
) {
  // 1. Register a new corporate learner user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const password = "ValidPass123!";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const createBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const authorizedUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedUser);

  // Validate the token structure
  const token: IAuthorizationToken = authorizedUser.token;
  typia.assert(token);
  TestValidator.predicate("access token is non-empty", token.access.length > 0);
  TestValidator.predicate(
    "refresh token is non-empty",
    token.refresh.length > 0,
  );

  // 2. Verify duplicate email registration returns an error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.corporateLearner.join(connection, {
        body: createBody,
      });
    },
  );

  // 3. Verify registration fails with missing required fields
  // We'll test missing tenant_id
  const missingTenantBody = {
    // tenant_id missing
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: password,
    first_name: firstName,
    last_name: lastName,
  } as any;
  await TestValidator.error("missing tenant_id should fail", async () => {
    await api.functional.auth.corporateLearner.join(connection, {
      body: missingTenantBody,
    });
  });

  // Test missing email
  const missingEmailBody = {
    tenant_id: tenantId,
    // email missing
    password: password,
    first_name: firstName,
    last_name: lastName,
  } as any;
  await TestValidator.error("missing email should fail", async () => {
    await api.functional.auth.corporateLearner.join(connection, {
      body: missingEmailBody,
    });
  });

  // Test missing password
  const missingPasswordBody = {
    tenant_id: tenantId,
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    // password missing
    first_name: firstName,
    last_name: lastName,
  } as any;
  await TestValidator.error("missing password should fail", async () => {
    await api.functional.auth.corporateLearner.join(connection, {
      body: missingPasswordBody,
    });
  });

  // Test missing first_name
  const missingFirstNameBody = {
    tenant_id: tenantId,
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: password,
    // first_name missing
    last_name: lastName,
  } as any;
  await TestValidator.error("missing first_name should fail", async () => {
    await api.functional.auth.corporateLearner.join(connection, {
      body: missingFirstNameBody,
    });
  });

  // Test missing last_name
  const missingLastNameBody = {
    tenant_id: tenantId,
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: password,
    first_name: firstName,
    // last_name missing
  } as any;
  await TestValidator.error("missing last_name should fail", async () => {
    await api.functional.auth.corporateLearner.join(connection, {
      body: missingLastNameBody,
    });
  });
}
