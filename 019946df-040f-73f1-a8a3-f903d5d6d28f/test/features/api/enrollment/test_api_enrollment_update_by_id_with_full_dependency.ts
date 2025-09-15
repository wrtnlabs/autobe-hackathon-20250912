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

export async function test_api_enrollment_update_by_id_with_full_dependency(
  connection: api.IConnection,
) {
  // 1. Create and authenticate the organizationAdmin user
  const organizationAdminCreate = {
    tenant_id: "00000000-0000-0000-0000-000000000000", // dummy UUID to be replaced
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdminUser: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminCreate,
    });
  typia.assert(organizationAdminUser);

  // 2. Create tenant organization
  const tenantCreate = {
    code: `tenant${RandomGenerator.alphaNumeric(8)}`,
    name: `Tenant ${RandomGenerator.name(2)}`,
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreate,
    });
  typia.assert(tenant);

  // 3. Create corporate learner in tenant
  const corporateLearnerCreate = {
    tenant_id: tenant.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const corporateLearner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.createCorporatelearners(
      connection,
      {
        body: corporateLearnerCreate,
      },
    );
  typia.assert(corporateLearner);

  // 4. Create a learning path associated with tenant
  const learningPathCreate = {
    tenant_id: tenant.id,
    code: `lp${RandomGenerator.alphaNumeric(6)}`,
    title: `Learning Path ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
  } satisfies IEnterpriseLmsLearningPaths.ICreate;

  const learningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      {
        body: learningPathCreate,
      },
    );
  typia.assert(learningPath);

  // 5. Create initial enrollment linking learner and learning path
  const enrollmentCreate = {
    learner_id: corporateLearner.id,
    learning_path_id: learningPath.id,
    status: "active",
    business_status: null,
  } satisfies IEnterpriseLmsEnrollment.ICreate;

  const enrollment: IEnterpriseLmsEnrollment =
    await api.functional.enterpriseLms.corporateLearner.enrollments.createEnrollment(
      connection,
      {
        body: enrollmentCreate,
      },
    );
  typia.assert(enrollment);

  // 6. Update the enrollment as organizationAdmin
  // Login as organizationAdmin to ensure proper authentication context
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: organizationAdminCreate.email,
      password: organizationAdminCreate.password,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  const enrollmentUpdateBody = {
    status: "completed",
    business_status: "passed",
    updated_at: new Date().toISOString(),
  } satisfies IEnterpriseLmsEnrollment.IUpdate;

  // Call update enrollment API
  const updatedEnrollment: IEnterpriseLmsEnrollment =
    await api.functional.enterpriseLms.organizationAdmin.enrollments.update(
      connection,
      {
        id: enrollment.id,
        body: enrollmentUpdateBody,
      },
    );
  typia.assert(updatedEnrollment);

  // Validate updated fields
  TestValidator.equals(
    "Enrollment status updated",
    updatedEnrollment.status,
    enrollmentUpdateBody.status,
  );
  TestValidator.equals(
    "Enrollment business status updated",
    updatedEnrollment.business_status,
    enrollmentUpdateBody.business_status,
  );
  TestValidator.equals(
    "Enrollment updated_at timestamp updated",
    updatedEnrollment.updated_at,
    enrollmentUpdateBody.updated_at,
  );

  // Validate unchanged keys remain
  TestValidator.equals(
    "Enrollment tenant id unchanged",
    updatedEnrollment.learner_id,
    enrollment.learner_id,
  );
  TestValidator.equals(
    "Enrollment learning path id unchanged",
    updatedEnrollment.learning_path_id,
    enrollment.learning_path_id,
  );
  TestValidator.equals(
    "Enrollment id unchanged",
    updatedEnrollment.id,
    enrollment.id,
  );
}
