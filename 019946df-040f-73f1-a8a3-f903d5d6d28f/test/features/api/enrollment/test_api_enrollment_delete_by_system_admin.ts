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
 * Comprehensive E2E test for deleting an enrollment by systemAdmin.
 *
 * This test verifies the complete lifecycle of the enrollment entity from
 * creation by various roles to deletion by systemAdmin role, ensuring correct
 * authentication, authorization, and linkage among entities in the tenant
 * context of Enterprise LMS.
 */
export async function test_api_enrollment_delete_by_system_admin(
  connection: api.IConnection,
) {
  // 1. SystemAdmin user registration
  const systemAdminCreate = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreate,
    });
  typia.assert(systemAdmin);

  // 2. Create tenant organization
  const tenantCreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreate,
    });
  typia.assert(tenant);

  // 3. Create organizationAdmin user to create corporate learner
  const orgAdminCreate = {
    tenant_id: tenant.id,
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreate,
    });
  typia.assert(organizationAdmin);

  // Authenticate as organizationAdmin to create corporate learner
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminCreate.email,
      password: orgAdminCreate.password,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 4. Create corporate learner user for tenant
  const corporateLearnerCreate = {
    tenant_id: tenant.id,
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: RandomGenerator.alphaNumeric(20),
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

  // Authenticate as corporate learner user
  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: corporateLearnerCreate.email,
      password: corporateLearnerCreate.password,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  // 5. Create learning path for tenant
  const learningPathCreate = {
    tenant_id: tenant.id,
    code: RandomGenerator.alphaNumeric(6),
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 6. Create enrollment linking corporate learner and learning path
  const enrollmentCreate = {
    learner_id: corporateLearner.id,
    learning_path_id: learningPath.id,
    status: "active",
  } satisfies IEnterpriseLmsEnrollment.ICreate;

  const enrollment: IEnterpriseLmsEnrollment =
    await api.functional.enterpriseLms.corporateLearner.enrollments.createEnrollment(
      connection,
      {
        body: enrollmentCreate,
      },
    );
  typia.assert(enrollment);

  // 7. Authenticate as systemAdmin for deletion
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminCreate.email,
      password_hash: systemAdminCreate.password_hash,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 8. Delete the created enrollment by systemAdmin
  await api.functional.enterpriseLms.systemAdmin.enrollments.erase(connection, {
    id: enrollment.id,
  });
}
