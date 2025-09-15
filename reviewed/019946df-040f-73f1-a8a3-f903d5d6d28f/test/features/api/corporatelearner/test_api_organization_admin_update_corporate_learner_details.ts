import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This E2E test validates updating corporate learner details by an
 * authorized organization administrator. It performs the following steps:
 *
 * 1. The organization admin signs up via join API with a unique tenant ID.
 * 2. The admin logs in to authenticate and obtain tokens.
 * 3. The admin creates a corporate learner under the same tenant.
 * 4. The admin updates the corporate learner's email, first and last names.
 * 5. The test verifies the updated details are correct and typesafe.
 * 6. It tests that updating to duplicate email causes an error.
 * 7. It tests that unauthorized update attempts fail.
 *
 * All API calls use strict typing and validation using typia.assert. Test
 * inputs use RandomGenerator and typia.random to generate valid data. The
 * test enforces strict tenant-based authorization and uniqueness rules.
 */
export async function test_api_organization_admin_update_corporate_learner_details(
  connection: api.IConnection,
) {
  // Organization administrator sign-up
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "P4ssw0rd!";
  const orgAdminFirstName = RandomGenerator.name();
  const orgAdminLastName = RandomGenerator.name();

  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        tenant_id: tenantId,
        email: orgAdminEmail,
        password: orgAdminPassword,
        first_name: orgAdminFirstName,
        last_name: orgAdminLastName,
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    },
  );
  typia.assert(orgAdmin);

  // Organization administrator login
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // Create initial corporate learner
  const initialLearnerEmail = typia.random<string & tags.Format<"email">>();
  const initialLearnerPassword = "Learner123!";
  const initialLearnerFirstName = RandomGenerator.name();
  const initialLearnerLastName = RandomGenerator.name();

  const corporateLearner =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.createCorporatelearners(
      connection,
      {
        body: {
          tenant_id: tenantId,
          email: initialLearnerEmail,
          password: initialLearnerPassword,
          first_name: initialLearnerFirstName,
          last_name: initialLearnerLastName,
        } satisfies IEnterpriseLmsCorporateLearner.ICreate,
      },
    );
  typia.assert(corporateLearner);

  // Update with new details
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newFirstName = RandomGenerator.name();
  const newLastName = RandomGenerator.name();

  const updatedCorporateLearner =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.updateCorporatelearner(
      connection,
      {
        corporatelearnerId: corporateLearner.id,
        body: {
          email: newEmail,
          first_name: newFirstName,
          last_name: newLastName,
        } satisfies IEnterpriseLmsCorporateLearner.IUpdate,
      },
    );
  typia.assert(updatedCorporateLearner);

  // Verify update
  TestValidator.equals(
    "updatedCorporateLearner.id matches original",
    updatedCorporateLearner.id,
    corporateLearner.id,
  );
  TestValidator.equals(
    "updatedCorporateLearner.email is updated",
    updatedCorporateLearner.email,
    newEmail,
  );
  TestValidator.equals(
    "updatedCorporateLearner.first_name is updated",
    updatedCorporateLearner.first_name,
    newFirstName,
  );
  TestValidator.equals(
    "updatedCorporateLearner.last_name is updated",
    updatedCorporateLearner.last_name,
    newLastName,
  );

  // Test error on duplicate email update
  await TestValidator.error(
    "update with duplicate email should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.corporatelearners.updateCorporatelearner(
        connection,
        {
          corporatelearnerId: corporateLearner.id,
          body: {
            email: initialLearnerEmail, // duplicate email
          } satisfies IEnterpriseLmsCorporateLearner.IUpdate,
        },
      );
    },
  );

  // Test unauthorized update (simulate by clearing authorization headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.updateCorporatelearner(
      unauthenticatedConnection,
      {
        corporatelearnerId: corporateLearner.id,
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IEnterpriseLmsCorporateLearner.IUpdate,
      },
    );
  });
}
