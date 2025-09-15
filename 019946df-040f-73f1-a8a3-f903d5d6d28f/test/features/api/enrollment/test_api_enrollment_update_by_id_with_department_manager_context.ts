import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";
import type { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This E2E test scenario ensures a successful update of an enrollment record by
 * ID under the departmentManager role context within the Enterprise LMS.
 *
 * Workflow Steps:
 *
 * 1. Register and authenticate a departmentManager user via POST
 *    /auth/departmentManager/join to obtain an authorization token.
 * 2. Create a tenant organization via POST /enterpriseLms/systemAdmin/tenants to
 *    establish tenant context.
 * 3. Create a corporate learner user within the tenant using POST
 *    /enterpriseLms/organizationAdmin/corporatelearners.
 * 4. Create a learning path under the tenant using POST
 *    /enterpriseLms/corporateLearner/learningPaths.
 * 5. Create an enrollment record for the corporate learner and learning path using
 *    POST /enterpriseLms/corporateLearner/enrollments.
 * 6. Update the enrollment record using PUT
 *    /enterpriseLms/departmentManager/enrollments/{id} with modified status and
 *    business status.
 *
 * Validation Points:
 *
 * - Verify successful creation of all required dependent entities.
 * - Confirm that the enrollment update applies the requested changes.
 * - Ensure compliance with tenant isolation and role-based access controls.
 * - Validate the integrity and consistency of enrollment data.
 *
 * Edge Cases:
 *
 * - Attempting update with invalid or unauthorized enrollment ID should fail
 *   appropriately.
 * - Missing or expired authentication token blocks update request.
 *
 * Success Criteria:
 *
 * - Full dependency creation and enrollment update succeed without errors.
 * - Returned enrollment entity matches updated values.
 */
export async function test_api_enrollment_update_by_id_with_department_manager_context(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a departmentManager user
  const departmentManagerEmail = typia.random<string & tags.Format<"email">>();
  const departmentManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: {
        email: departmentManagerEmail,
        password: "Password123!",
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
      } satisfies IEnterpriseLmsDepartmentManager.ICreate,
    });
  typia.assert(departmentManager);

  // 2. Create a tenant organization (switch context by logging as systemAdmin first)
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = "Password123!";
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // Log in as systemAdmin to get token and set context
  const systemAdminLoggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
      } satisfies IEnterpriseLmsSystemAdmin.ILogin,
    });
  typia.assert(systemAdminLoggedIn);

  const tenantCode = `tenant-${RandomGenerator.alphaNumeric(6)}`;
  const tenantName = `Tenant ${RandomGenerator.name(2)}`;
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: tenantCode,
        name: tenantName,
      } satisfies IEnterpriseLmsTenant.ICreate,
    });
  typia.assert(tenant);

  // 3. Create a corporate learner user within the tenant (switch context to organizationAdmin)
  const organizationAdminEmail = typia.random<string & tags.Format<"email">>();
  const organizationAdminPassword = "Password123!";
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: organizationAdminEmail,
        password: organizationAdminPassword,
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // Log in as organizationAdmin to get token and set context
  const organizationAdminLoggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: organizationAdminEmail,
        password: organizationAdminPassword,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(organizationAdminLoggedIn);

  // Create corporate learner within tenant
  const corporateLearnerEmail = typia.random<string & tags.Format<"email">>();
  const corporateLearnerPassword = "Password123!";
  const corporateLearner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.createCorporatelearners(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          email: corporateLearnerEmail,
          password: corporateLearnerPassword,
          first_name: RandomGenerator.name(2),
          last_name: RandomGenerator.name(2),
        } satisfies IEnterpriseLmsCorporateLearner.ICreate,
      },
    );
  typia.assert(corporateLearner);

  // 4. Create a learning path under the tenant (switch context to corporateLearner)
  const corporateLearnerLoggedIn: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: {
        email: corporateLearnerEmail,
        password: corporateLearnerPassword,
      } satisfies IEnterpriseLmsCorporateLearner.ILogin,
    });
  typia.assert(corporateLearnerLoggedIn);

  const learningPathCode = `lp-${RandomGenerator.alphaNumeric(6)}`;
  const learningPathTitle = `Learning Path ${RandomGenerator.name(2)}`;
  const learningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          code: learningPathCode,
          title: learningPathTitle,
          description: `Created for testing enrollment update. ${RandomGenerator.paragraph({ sentences: 5 })}`,
          status: "active",
        } satisfies IEnterpriseLmsLearningPaths.ICreate,
      },
    );
  typia.assert(learningPath);

  // 5. Create an enrollment record for the corporate learner and learning path (context stays corporateLearner)
  const enrollmentStatus = "active";

  const enrollment: IEnterpriseLmsEnrollment =
    await api.functional.enterpriseLms.corporateLearner.enrollments.createEnrollment(
      connection,
      {
        body: {
          learner_id: corporateLearner.id,
          learning_path_id: learningPath.id,
          status: enrollmentStatus,
          business_status: "initial",
        } satisfies IEnterpriseLmsEnrollment.ICreate,
      },
    );
  typia.assert(enrollment);

  // 6. Update the enrollment record by departmentManager (authenticate departmentManager again to set context)
  const departmentManagerLoggedIn: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: {
        email: departmentManagerEmail,
        password: "Password123!",
      } satisfies IEnterpriseLmsDepartmentManager.ILogin,
    });
  typia.assert(departmentManagerLoggedIn);

  // Prepare update body
  const updatedStatus = "completed";
  const updatedBusinessStatus = "reviewed";

  const updatedEnrollment: IEnterpriseLmsEnrollment =
    await api.functional.enterpriseLms.departmentManager.enrollments.update(
      connection,
      {
        id: enrollment.id,
        body: {
          status: updatedStatus,
          business_status: updatedBusinessStatus,
        } satisfies IEnterpriseLmsEnrollment.IUpdate,
      },
    );
  typia.assert(updatedEnrollment);

  // Assert that the updates were applied
  TestValidator.equals(
    "Enrollment status updated correctly",
    updatedEnrollment.status,
    updatedStatus,
  );
  TestValidator.equals(
    "Enrollment business status updated correctly",
    updatedEnrollment.business_status,
    updatedBusinessStatus,
  );
  TestValidator.equals(
    "Enrollment ID remains unchanged",
    updatedEnrollment.id,
    enrollment.id,
  );
  TestValidator.equals(
    "Enrollment learner ID remains unchanged",
    updatedEnrollment.learner_id,
    enrollment.learner_id,
  );
  TestValidator.equals(
    "Enrollment learning path ID remains unchanged",
    updatedEnrollment.learning_path_id,
    enrollment.learning_path_id,
  );
}
