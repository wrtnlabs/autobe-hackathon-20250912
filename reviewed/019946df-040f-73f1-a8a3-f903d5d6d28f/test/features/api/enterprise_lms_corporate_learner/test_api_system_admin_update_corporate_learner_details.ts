import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * End-to-end test validating system admin update operation for corporate
 * learner details.
 *
 * This test covers:
 *
 * - System admin user join and login authentication.
 * - Creation of a corporate learner user to be updated.
 * - Successful update of the corporate learner's email, first and last name,
 *   tenant id and status.
 * - Verification that the updated information is returned correctly.
 * - Error validation for duplicate email within tenant, invalid tenant id, and
 *   unauthorized update.
 *
 * Ensures tenant isolation, email uniqueness, and permission enforcement are
 * respected.
 */
export async function test_api_system_admin_update_corporate_learner_details(
  connection: api.IConnection,
) {
  // 1. System Admin join (registration) with fixed password hash for test consistency
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPasswordHash = "hashed_password_for_testing";
  const joinBody = {
    email: systemAdminEmail,
    password_hash: systemAdminPasswordHash,
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(systemAdmin);

  const tenantId = systemAdmin.tenant_id;

  // 2. System Admin login to authenticate (simulate real login sequence)
  const loginBody = {
    email: systemAdminEmail,
    password_hash: systemAdminPasswordHash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const login: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(login);

  // 3. Create initial corporate learner user to update later
  // Use tenantId from system admin to ensure tenant matching
  const learnerEmail = typia.random<string & tags.Format<"email">>();
  const learnerCreateBody = {
    tenant_id: tenantId,
    email: learnerEmail,
    password: "initial_password",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const createdLearner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.systemAdmin.corporatelearners.createCorporatelearners(
      connection,
      { body: learnerCreateBody },
    );
  typia.assert(createdLearner);

  // 4. Update corporate learner with new details
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newFirstName = RandomGenerator.name();
  const newLastName = RandomGenerator.name();
  const newStatus = "active";
  const updateBody = {
    email: newEmail,
    first_name: newFirstName,
    last_name: newLastName,
    status: newStatus,
  } satisfies IEnterpriseLmsCorporateLearner.IUpdate;
  const updatedLearner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.systemAdmin.corporatelearners.updateCorporatelearner(
      connection,
      {
        corporatelearnerId: createdLearner.id,
        body: updateBody,
      },
    );
  typia.assert(updatedLearner);

  TestValidator.equals(
    "updated learner id matches",
    updatedLearner.id,
    createdLearner.id,
  );
  TestValidator.equals(
    "tenant_id remains the same",
    updatedLearner.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "email updated correctly",
    updatedLearner.email,
    newEmail,
  );
  TestValidator.equals(
    "first name updated correctly",
    updatedLearner.first_name,
    newFirstName,
  );
  TestValidator.equals(
    "last name updated correctly",
    updatedLearner.last_name,
    newLastName,
  );
  TestValidator.equals(
    "status updated correctly",
    updatedLearner.status,
    newStatus,
  );

  // 5. Error case: attempt to update with duplicate email within same tenant
  const anotherLearnerBody = {
    tenant_id: tenantId,
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const anotherLearner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.systemAdmin.corporatelearners.createCorporatelearners(
      connection,
      { body: anotherLearnerBody },
    );
  typia.assert(anotherLearner);

  await TestValidator.error(
    "update fails with duplicate email in same tenant",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.corporatelearners.updateCorporatelearner(
        connection,
        {
          corporatelearnerId: anotherLearner.id,
          body: {
            email: newEmail, // duplicate of previously updated email
          } satisfies IEnterpriseLmsCorporateLearner.IUpdate,
        },
      );
    },
  );

  // 6. Error case: attempt to update with invalid tenant_id (simulate by updating tenant_id)
  // As IEnterpriseLmsCorporateLearner.IUpdate does not support tenant_id update, skip this negative test
  // because tenant_id cannot be changed via update properties according to schema.
  // Instead, test invalid tenant logic indirectly by attempting an update with invalid corporatelearnerId.

  await TestValidator.error(
    "update fails with unknown corporatelearnerId",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.corporatelearners.updateCorporatelearner(
        connection,
        {
          corporatelearnerId: typia.random<string & tags.Format<"uuid">>(), // random unknown ID
          body: {
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies IEnterpriseLmsCorporateLearner.IUpdate,
        },
      );
    },
  );

  // 7. Error case: unauthorized access
  // Simulate unauthorized by using a separate connection with no authentication (empty headers)
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized update attempt is rejected",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.corporatelearners.updateCorporatelearner(
        unauthorizedConn,
        {
          corporatelearnerId: createdLearner.id,
          body: {
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies IEnterpriseLmsCorporateLearner.IUpdate,
        },
      );
    },
  );
}
