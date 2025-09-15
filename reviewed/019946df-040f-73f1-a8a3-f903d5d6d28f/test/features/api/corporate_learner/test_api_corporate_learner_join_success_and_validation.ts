import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";

/**
 * This end-to-end test covers the full workflow of a corporate learner
 * joining the Enterprise LMS platform. It validates successful
 * tenant-scoped corporate learner registration, ensuring that a valid
 * tenant_id, email, password, first and last name allow creation of an
 * authorized user with issued JWT tokens.
 *
 * The test also verifies handling of error cases such as duplicate email
 * registration within the same tenant and invalid tenant_id usage.
 *
 * Steps:
 *
 * 1. Generate a valid tenant_id UUID.
 * 2. Build a valid ICreate payload with random email, password, and names.
 * 3. Call the join API and assert that the response matches IAuthorized.
 * 4. Confirm the returned token conforms to IAuthorizationToken.
 * 5. Test duplicate email registration triggers an error.
 * 6. Test invalid tenant_id registration triggers an error.
 */
export async function test_api_corporate_learner_join_success_and_validation(
  connection: api.IConnection,
) {
  // 1. Generate a fake tenant_id (UUID format)
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Create a valid ICreate body
  const createBody = {
    tenant_id: tenantId,
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  // 3. Perform the join operation
  const authorized: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: createBody,
    });

  // 4. Assert the response type and token
  typia.assert(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 5. Duplicate email test: Should throw error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.corporateLearner.join(connection, {
        body: createBody,
      });
    },
  );

  // 6. Invalid tenant_id test: Should throw error
  const invalidCreateBody = {
    ...createBody,
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  await TestValidator.error(
    "invalid tenant_id registration should fail",
    async () => {
      await api.functional.auth.corporateLearner.join(connection, {
        body: invalidCreateBody,
      });
    },
  );
}
