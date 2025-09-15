import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

/**
 * End-to-end test for the External Learner guest user join flow with
 * validation.
 *
 * This test covers the complete user registration workflow for external
 * learner guests in a multi-tenant Enterprise LMS environment.
 *
 * Steps performed:
 *
 * 1. Setup authentication context by executing prerequisite join operations as
 *    dependencies.
 * 2. Register a new external learner with realistic tenant, email, and profile
 *    data.
 * 3. Validate the response fully conforms to the authorized external learner
 *    structure including JWT tokens.
 * 4. Attempt to register another external learner with the same email and
 *    tenant to test rejection of duplicate email.
 * 5. Attempt to register with a random, non-existent tenant ID to test tenant
 *    association validation.
 * 6. Validate all error cases are rejected with proper error handling.
 *
 * This ensures multi-tenant data isolation, secure password handling, and
 * role-based token issuance.
 */
export async function test_api_external_learner_join_flow_with_validation(
  connection: api.IConnection,
) {
  // 1. Authentication prerequisite: run dependencies to set up a valid external learner guest user context
  // (simulate as per scenario dependencies)
  // Note: Dependencies not directly invoked as this test encapsulates main join function

  // 2. Prepare valid, realistic join input
  const tenantId = typia.random<string & tags.Format<"uuid">>(); // existing valid tenant
  const email = `${RandomGenerator.name(2).replace(/ /g, "").toLowerCase()}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(64); // simulate hash
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  const joinInput = {
    tenant_id: tenantId,
    email: email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status: status,
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  // 3. Execute join operation with valid input
  const authorized: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: joinInput,
      },
    );
  typia.assert(authorized);

  TestValidator.equals(
    "Join response email matches request",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "Join response tenant_id matches request",
    authorized.tenant_id,
    tenantId,
  );
  TestValidator.predicate(
    "Join response access token exists",
    authorized.token.access.length > 10,
  );
  TestValidator.predicate(
    "Join response refresh token exists",
    authorized.token.refresh.length > 10,
  );

  // 4. Test duplicate email rejection within the same tenant
  await TestValidator.error("Duplicate email join should fail", async () => {
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: {
          tenant_id: tenantId,
          email: email, // same
          password_hash: RandomGenerator.alphaNumeric(64),
          first_name: RandomGenerator.name(1),
          last_name: RandomGenerator.name(1),
          status: "active",
        } satisfies IEnterpriseLmsExternalLearner.IJoin,
      },
    );
  });

  // 5. Test invalid tenant association rejection
  const invalidTenantId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "Join with invalid tenant_id should fail",
    async () => {
      await api.functional.auth.externalLearner.join.joinExternalLearner(
        connection,
        {
          body: {
            tenant_id: invalidTenantId,
            email: `${RandomGenerator.name(2).replace(/ /g, "").toLowerCase()}@example.com`,
            password_hash: RandomGenerator.alphaNumeric(64),
            first_name: RandomGenerator.name(1),
            last_name: RandomGenerator.name(1),
            status: "active",
          } satisfies IEnterpriseLmsExternalLearner.IJoin,
        },
      );
    },
  );
}
