import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This scenario verifies the system administrator's ability to create a
 * corporate learner account associated with a specific tenant. It validates
 * tenant existence and the enforcement of tenant isolation.
 *
 * Workflow:
 *
 * 1. Perform system administrator registration through /auth/systemAdmin/join.
 * 2. Authenticate using /auth/systemAdmin/login.
 * 3. Validate tenant availability and activation.
 * 4. Submit the corporate learner creation request with all required data
 *    including tenant ID and personal user details.
 * 5. Validate successful creation response and verify the corporate learner record
 *    correctness.
 * 6. Attempt invalid creation scenarios such as duplicate email and improper role
 *    authorization.
 *
 * The scenario tests security, tenant isolation, data integrity, and system
 * role authorization.
 *
 * Success criteria: Corporate learner creation succeeds only with proper tenant
 * and admin authorization; errors are appropriately returned and managed.
 */
export async function test_api_system_admin_corporate_learner_creation_with_tenant(
  connection: api.IConnection,
) {
  // 1. Perform system administrator registration
  const adminPassword = "Secret123!";
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: adminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const adminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Authenticate system administrator
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminPassword,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const adminLoggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Prepare corporate learner creation data with verified tenant_id
  const tenantId = adminLoggedIn.tenant_id;

  const learnerEmail = typia.random<string & tags.Format<"email">>();
  const learnerCreateBody = {
    tenant_id: tenantId,
    email: learnerEmail,
    password: "Password!234",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  // 4. Create corporate learner successfully
  const createdLearner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.systemAdmin.corporatelearners.createCorporatelearners(
      connection,
      {
        body: learnerCreateBody,
      },
    );
  typia.assert(createdLearner);

  TestValidator.equals(
    "Tenant ID should match",
    createdLearner.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "Email should match input",
    createdLearner.email,
    learnerCreateBody.email,
  );
  TestValidator.equals(
    "First name should match input",
    createdLearner.first_name,
    learnerCreateBody.first_name,
  );
  TestValidator.equals(
    "Last name should match input",
    createdLearner.last_name,
    learnerCreateBody.last_name,
  );
  TestValidator.equals(
    "Status should be active",
    createdLearner.status,
    "active",
  );

  // 5. Invalid scenario: duplicate email within the same tenant - expect error
  await TestValidator.error(
    "should fail to create corporate learner with duplicate email",
    async () => {
      const dupBody = {
        tenant_id: tenantId,
        email: learnerEmail, // duplicate email
        password: "Pass456!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsCorporateLearner.ICreate;
      await api.functional.enterpriseLms.systemAdmin.corporatelearners.createCorporatelearners(
        connection,
        {
          body: dupBody,
        },
      );
    },
  );

  // 6. Invalid scenario: incorrect role authorization - Not feasible to simulate without different user context or role APIs, so skip.
}
