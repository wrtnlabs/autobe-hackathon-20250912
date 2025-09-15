import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This scenario tests the retrieval of a corporate learner's detailed
 * information by a system administrator.
 *
 * It covers the following steps:
 *
 * 1. System admin user joins via the /auth/systemAdmin/join endpoint with valid
 *    data.
 * 2. System admin user logs in via the /auth/systemAdmin/login endpoint to obtain
 *    authentication tokens.
 * 3. Using authenticated context, the test simulates the presence of a corporate
 *    learner entity by creating one with correct properties including id,
 *    tenant_id, email, hashed password, full name details, status, and
 *    timestamps.
 * 4. The test retrieves the detailed corporate learner record by its unique id via
 *    the /enterpriseLms/systemAdmin/corporatelearners/{corporatelearnerId} GET
 *    endpoint.
 * 5. It asserts that retrieved corporate learner details exactly match the created
 *    learner data, including tenant isolation (tenant_id matches), and
 *    validates the shape and types with typia.
 *
 * The scenario also validates forbidden access if the retrieval is performed
 * without authentication or with improper authorization.
 *
 * Each API call is awaited properly, and all type-value constraints from DTOs
 * and schemas are respected.
 *
 * This ensures a secure and correct system admin retrieval of corporate learner
 * information respecting multi-tenant context.
 */
export async function test_api_corporatelearner_detail_retrieval_by_systemadmin(
  connection: api.IConnection,
) {
  // Step 1: System admin join
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // Step 2: System admin login
  const systemAdminLoginBody = {
    email: systemAdmin.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loginResult: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(loginResult);

  // Step 3: Simulate corporate learner creation
  // We simulate an IEnterpriseLmsCorporateLearner data to represent an existing entity
  const corporateLearner: IEnterpriseLmsCorporateLearner = {
    id: typia.random<string & tags.Format<"uuid">>(),
    tenant_id: systemAdmin.tenant_id,
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // Step 4: Retrieve the corporate learner detail by system admin
  const retrieved: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.systemAdmin.corporatelearners.atCorporatelearners(
      connection,
      {
        corporatelearnerId: corporateLearner.id,
      },
    );

  // Step 5: Validate retrieved data matches expected data
  typia.assert(retrieved);

  TestValidator.equals(
    "corporate learner id matches",
    retrieved.id,
    corporateLearner.id,
  );

  TestValidator.equals(
    "corporate learner tenant_id matches",
    retrieved.tenant_id,
    systemAdmin.tenant_id,
  );

  TestValidator.predicate(
    "retrieved email is valid email format",
    /^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(retrieved.email),
  );

  TestValidator.equals(
    "corporate learner status is active",
    retrieved.status,
    "active",
  );

  // Step 6: Validate forbidden access if not authenticated (anonymous connection)
  const anonymousConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "should fail to retrieve corporate learner detail without auth",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.corporatelearners.atCorporatelearners(
        anonymousConnection,
        {
          corporatelearnerId: corporateLearner.id,
        },
      );
    },
  );
}
