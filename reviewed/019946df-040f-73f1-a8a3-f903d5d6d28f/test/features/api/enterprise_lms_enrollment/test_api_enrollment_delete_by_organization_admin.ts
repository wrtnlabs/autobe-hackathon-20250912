import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";
import type { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * E2E test covering the deletion of an enrollment record by an
 * organizationAdmin user.
 *
 * Workflow:
 *
 * 1. Register and authenticate an organizationAdmin user.
 * 2. Create a tenant organization.
 * 3. Create a corporate learner within the tenant.
 * 4. Create a learning path under the tenant.
 * 5. Create an enrollment linking the learner and learning path.
 * 6. Delete the enrollment using organizationAdmin credentials.
 * 7. Validate deletion error scenarios such as unauthorized delete and
 *    deleting non-existing enrollment.
 */
export async function test_api_enrollment_delete_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. OrganizationAdmin user join & authenticate
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: "00000000-0000-0000-0000-000000000000",
        email: orgAdminEmail,
        password: "P@ssw0rd!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdmin);

  // 2. Create tenant
  const tenantCode = RandomGenerator.alphaNumeric(8);
  const tenantName = RandomGenerator.name();
  const tenantCreateBody = {
    code: tenantCode,
    name: tenantName,
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 3. Perform login again for orgAdmin to refresh the auth token with actual tenant_id
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "P@ssw0rd!",
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 4. Create corporate learner inside tenant
  const corpLearnerCreateBody = {
    tenant_id: tenant.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const corpLearner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.createCorporatelearners(
      connection,
      {
        body: corpLearnerCreateBody,
      },
    );
  typia.assert(corpLearner);

  // 5. Create learning path for tenant
  const learningPathCreateBody = {
    tenant_id: tenant.id,
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
  } satisfies IEnterpriseLmsLearningPaths.ICreate;

  // Switch to corporate learner login for creating learning path
  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: corpLearner.email,
      password: "P@ssw0rd!",
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  const learningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      {
        body: learningPathCreateBody,
      },
    );
  typia.assert(learningPath);

  // 6. Create enrollment for corp learner in learning path
  const enrollmentCreateBody = {
    learner_id: corpLearner.id,
    learning_path_id: learningPath.id,
    status: "active",
    business_status: null,
  } satisfies IEnterpriseLmsEnrollment.ICreate;

  const enrollment: IEnterpriseLmsEnrollment =
    await api.functional.enterpriseLms.corporateLearner.enrollments.createEnrollment(
      connection,
      {
        body: enrollmentCreateBody,
      },
    );
  typia.assert(enrollment);

  // 7. Switch back to organizationAdmin login to delete enrollment
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "P@ssw0rd!",
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 8. Delete enrollment
  await api.functional.enterpriseLms.organizationAdmin.enrollments.erase(
    connection,
    {
      id: enrollment.id,
    },
  );

  // 9. Validate deletion: attempt deletion without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Deleting enrollment without authentication should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.enrollments.erase(
        unauthConn,
        {
          id: enrollment.id,
        },
      );
    },
  );

  // 10. Validate deletion error for non-existent enrollment
  await TestValidator.error(
    "Deleting a non-existent enrollment should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.enrollments.erase(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
