import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This E2E test scenario validates the successful retrieval of detailed
 * information of an external learner user by their unique identifier. It covers
 * the full user journey starting from systemAdmin registration and login to
 * create tenant context, followed by organizationAdmin registration and login
 * for tenant-specific authorization. The external learner user is then created
 * in the tenant organization, and the retrieval endpoint is tested by fetching
 * the external learner's full details.
 *
 * Test Steps:
 *
 * 1. Register a new systemAdmin user via /auth/systemAdmin/join and authenticate.
 * 2. Register a new organizationAdmin user under a created tenant via
 *    /auth/organizationAdmin/join and authenticate.
 * 3. Create a new tenant organization via /enterpriseLms/systemAdmin/tenants POST.
 * 4. Create external learner user in the tenant organization via
 *    /enterpriseLms/externallearners POST.
 * 5. Use the GET
 *    /enterpriseLms/organizationAdmin/externallearners/{externallearnerId} to
 *    fetch the external learner details.
 *
 * Validation:
 *
 * - Validate that retrieval returns HTTP 200 with the full user profile matching
 *   the created external learner.
 * - Verify tenant isolation is enforced by matching tenant IDs.
 * - Check presence of expected user fields and data consistency.
 *
 * Business Rules:
 *
 * - Authorization is required by organizationAdmin within the tenant.
 * - External learners cannot access other tenant data.
 * - Soft deletion flags prevent retrieval of deleted users.
 *
 * Success Criteria:
 *
 * - Successful creation and authentication of all required user contexts.
 * - Accurate retrieval of external learner details.
 * - Proper authorization enforcement.
 *
 * Error Handling:
 *
 * - Attempting to retrieve external learner with incorrect ID should return not
 *   found error.
 * - Unauthorized access returns forbidden error.
 */
export async function test_api_externallearner_retrieve_detail_success(
  connection: api.IConnection,
) {
  // 1. Register systemAdmin user and authenticate
  const systemAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const systemAdminPassword: string = RandomGenerator.alphaNumeric(16);
  const systemAdminCreateBody = {
    email: systemAdminEmail,
    password_hash: systemAdminPassword,
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: systemAdminPassword,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 2. Create tenant organization
  const tenantCreateBody = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(3),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 3. Register organizationAdmin user under tenant and authenticate
  const orgAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword: string = RandomGenerator.alphaNumeric(16);
  const orgAdminCreateBody = {
    tenant_id: tenant.id,
    email: orgAdminEmail,
    password: orgAdminPassword,
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(organizationAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 4. Create external learner in the tenant organization
  const externalLearnerPasswordHash = RandomGenerator.alphaNumeric(16);
  const externalLearnerCreateBody = {
    tenant_id: tenant.id,
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: externalLearnerPasswordHash,
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.ICreate;

  const createdExternalLearner: IEnterpriseLmsExternalLearner =
    await api.functional.enterpriseLms.externallearners.create(connection, {
      body: externalLearnerCreateBody,
    });
  typia.assert(createdExternalLearner);

  // 5. Retrieve external learner details via organizationAdmin perspective
  const retrievedExternalLearner: IEnterpriseLmsExternalLearner =
    await api.functional.enterpriseLms.organizationAdmin.externallearners.atExternallearner(
      connection,
      {
        externallearnerId: createdExternalLearner.id,
      },
    );
  typia.assert(retrievedExternalLearner);

  // 6. Validate tenant isolation and data consistency
  TestValidator.equals(
    "tenant IDs should match",
    retrievedExternalLearner.tenant_id,
    tenant.id,
  );

  TestValidator.equals(
    "retrieved profile matches created profile",
    {
      email: retrievedExternalLearner.email,
      first_name: retrievedExternalLearner.first_name,
      last_name: retrievedExternalLearner.last_name,
      status: retrievedExternalLearner.status,
    },
    {
      email: externalLearnerCreateBody.email,
      first_name: externalLearnerCreateBody.first_name,
      last_name: externalLearnerCreateBody.last_name,
      status: externalLearnerCreateBody.status,
    },
  );

  TestValidator.predicate(
    "retrieved external learner is not soft-deleted",
    retrievedExternalLearner.deleted_at === null ||
      retrievedExternalLearner.deleted_at === undefined,
  );
}
