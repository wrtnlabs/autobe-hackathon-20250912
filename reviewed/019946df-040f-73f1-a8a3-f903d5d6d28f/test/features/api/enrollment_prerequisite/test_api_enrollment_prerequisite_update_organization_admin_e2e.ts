import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";
import type { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import type { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

export async function test_api_enrollment_prerequisite_update_organization_admin_e2e(
  connection: api.IConnection,
) {
  // 1. SystemAdmin join
  const systemAdminPassword = RandomGenerator.alphaNumeric(16);
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password_hash: systemAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // 2. SystemAdmin login
  const loggedInSystemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: systemAdmin.email,
        password_hash: systemAdminPassword,
      } satisfies IEnterpriseLmsSystemAdmin.ILogin,
    });
  typia.assert(loggedInSystemAdmin);

  // 3. Create tenant
  const tenantCode = RandomGenerator.alphaNumeric(8);
  const tenantName = RandomGenerator.name(2);
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: tenantCode,
        name: tenantName,
      } satisfies IEnterpriseLmsTenant.ICreate,
    });
  typia.assert(tenant);

  // 4. Join organizationAdmin under created tenant
  const orgAdminPassword = RandomGenerator.alphaNumeric(16);
  const joinedOrgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: orgAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(joinedOrgAdmin);

  // 5. Login organizationAdmin
  const loggedInOrgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: joinedOrgAdmin.email,
        password: orgAdminPassword,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(loggedInOrgAdmin);

  // 6. Create organizationAdmin user under tenant
  const orgAdminUnderTenantPassword = RandomGenerator.alphaNumeric(16);
  const orgAdminUnderTenant: IEnterpriseLmsOrganizationAdmin =
    await api.functional.enterpriseLms.organizationAdmin.organizationadmins.create(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
          password: orgAdminUnderTenantPassword,
          first_name: RandomGenerator.name(1),
          last_name: RandomGenerator.name(1),
          status: "active",
        } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
      },
    );
  typia.assert(orgAdminUnderTenant);

  // 7. Create corporate learner under tenant
  const corpLearnerPassword = RandomGenerator.alphaNumeric(16);
  const corpLearner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.createCorporatelearners(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
          password: corpLearnerPassword,
          first_name: RandomGenerator.name(1),
          last_name: RandomGenerator.name(1),
        } satisfies IEnterpriseLmsCorporateLearner.ICreate,
      },
    );
  typia.assert(corpLearner);

  // 8. Create learning path under tenant
  const learningPathCode = RandomGenerator.alphaNumeric(6);
  const learningPathTitle = RandomGenerator.name(3);
  const learningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          code: learningPathCode,
          title: learningPathTitle,
          status: "active",
        } satisfies IEnterpriseLmsLearningPaths.ICreate,
      },
    );
  typia.assert(learningPath);

  // 9. Create enrollment linking learner and learning path
  const enrollmentStatus = "active";
  const enrollment: IEnterpriseLmsEnrollment =
    await api.functional.enterpriseLms.corporateLearner.enrollments.createEnrollment(
      connection,
      {
        body: {
          learner_id: corpLearner.id,
          learning_path_id: learningPath.id,
          status: enrollmentStatus,
        } satisfies IEnterpriseLmsEnrollment.ICreate,
      },
    );
  typia.assert(enrollment);

  // 10. Create enrollment prerequisite linked to enrollment
  const prerequisiteCourseId = typia.random<string & tags.Format<"uuid">>();
  const enrollmentPrerequisite: IEnterpriseLmsEnrollmentPrerequisite =
    await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.createEnrollmentPrerequisite(
      connection,
      {
        enrollmentId: enrollment.id,
        body: {
          enrollment_id: enrollment.id,
          prerequisite_course_id: prerequisiteCourseId,
        } satisfies IEnterpriseLmsEnrollmentPrerequisite.ICreate,
      },
    );
  typia.assert(enrollmentPrerequisite);

  // 11. Update enrollment prerequisite - modify prerequisiteCourseId
  const newPrerequisiteCourseId = typia.random<string & tags.Format<"uuid">>();
  const enrollmentPrerequisiteUpdateBody = {
    id: enrollmentPrerequisite.id,
    enrollment_id: enrollment.id,
    prerequisite_course_id: newPrerequisiteCourseId,
  } satisfies IEnterpriseLmsEnrollmentPrerequisite.IUpdate;

  const updatedEnrollmentPrerequisite: IEnterpriseLmsEnrollmentPrerequisite =
    await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.updateEnrollmentPrerequisite(
      connection,
      {
        enrollmentId: enrollment.id,
        enrollmentPrerequisiteId: enrollmentPrerequisite.id,
        body: enrollmentPrerequisiteUpdateBody,
      },
    );
  typia.assert(updatedEnrollmentPrerequisite);

  // 12. Validate updated enrollment prerequisite
  TestValidator.equals(
    "enrollment prerequisite id",
    updatedEnrollmentPrerequisite.id,
    enrollmentPrerequisite.id,
  );
  TestValidator.equals(
    "enrollment prerequisite enrollment_id",
    updatedEnrollmentPrerequisite.enrollment_id,
    enrollment.id,
  );
  TestValidator.equals(
    "enrollment prerequisite updated prerequisite_course_id",
    updatedEnrollmentPrerequisite.prerequisite_course_id,
    newPrerequisiteCourseId,
  );
}
