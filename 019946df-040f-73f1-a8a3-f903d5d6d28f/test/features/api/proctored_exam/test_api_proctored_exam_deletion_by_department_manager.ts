import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This E2E test validates the deletion of a proctored exam by a department
 * manager in Enterprise LMS.
 *
 * It includes the following steps:
 *
 * 1. Create and authenticate a Department Manager user (join and login).
 * 2. Create a Tenant organization as the system scope.
 * 3. Create an Organization Admin user and authenticate.
 * 4. Using Organization Admin, create a Certification linked to the Tenant.
 * 5. Create a System Admin user and authenticate.
 * 6. Using System Admin, create an Assessment linked to the Certification and
 *    Tenant.
 * 7. Switch to Department Manager authentication.
 * 8. Create a Proctored Exam associated with the Assessment.
 * 9. Delete the created Proctored Exam as Department Manager.
 * 10. Attempt to retrieve the deleted Proctored Exam, expecting an error (404).
 *
 * Throughout, authentication role switching is performed properly to
 * simulate multi-role interaction. Data integrity checks are done via
 * typia.assert. TestValidator is used to confirm deletion.
 */
export async function test_api_proctored_exam_deletion_by_department_manager(
  connection: api.IConnection,
) {
  // 1. Create and authenticate Department Manager user
  const departmentManagerEmail =
    RandomGenerator.alphaNumeric(8) + "@deptmanager.example.com";
  const departmentManagerPassword = "StrongPassword123!";
  const departmentManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: {
        email: departmentManagerEmail,
        password: departmentManagerPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsDepartmentManager.ICreate,
    });
  typia.assert(departmentManager);

  // 2. Create a Tenant organization using System Admin role
  const systemAdminEmail =
    RandomGenerator.alphaNumeric(8) + "@sysadmin.example.com";
  const systemAdminPassword = "StrongPassword123!";

  // Create System Admin user
  const sysAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(sysAdmin);

  // Create Tenant
  const tenantCode = RandomGenerator.alphaNumeric(6);
  const tenantName = RandomGenerator.name(2);
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: tenantCode,
        name: tenantName,
      } satisfies IEnterpriseLmsTenant.ICreate,
    });
  typia.assert(tenant);

  // 3. Create Organization Admin user scoped to tenant
  const organizationAdminEmail =
    RandomGenerator.alphaNumeric(8) + "@orgadmin.example.com";
  const organizationAdminPassword = "StrongPassword123!";
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: organizationAdminEmail,
        password: organizationAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // 4. Create Certification linked to tenant using Organization Admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: organizationAdminEmail,
      password: organizationAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  const certificationCode = RandomGenerator.alphaNumeric(8);
  const certificationName = RandomGenerator.name(2);
  const certificationDescription = RandomGenerator.content({ paragraphs: 1 });

  const certification: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          code: certificationCode,
          name: certificationName,
          description: certificationDescription,
          status: "active",
        } satisfies IEnterpriseLmsCertification.ICreate,
      },
    );
  typia.assert(certification);

  // 5. Create Assessment linked to Certification using System Admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: systemAdminPassword,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  const assessmentCode = RandomGenerator.alphaNumeric(8);
  const assessmentTitle = RandomGenerator.name(3);
  const assessmentDescription = RandomGenerator.content({ paragraphs: 1 });
  const assessmentType = "quiz";
  const maxScore = 100;
  const passingScore = 70;
  const scheduledStartAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const scheduledEndAt = new Date(
    Date.now() + 1000 * 60 * 60 * 2,
  ).toISOString();
  const assessmentStatus = "active";

  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          code: assessmentCode,
          title: assessmentTitle,
          description: assessmentDescription,
          assessment_type: assessmentType,
          max_score: maxScore,
          passing_score: passingScore,
          scheduled_start_at: scheduledStartAt,
          scheduled_end_at: scheduledEndAt,
          status: assessmentStatus,
        } satisfies IEnterpriseLmsAssessments.ICreate,
      },
    );
  typia.assert(assessment);

  // 6. Switch authentication to Department Manager
  await api.functional.auth.departmentManager.login(connection, {
    body: {
      email: departmentManagerEmail,
      password: departmentManagerPassword,
    } satisfies IEnterpriseLmsDepartmentManager.ILogin,
  });

  // 7. Create Proctored Exam linked to assessment as Department Manager
  const examSessionId = RandomGenerator.alphaNumeric(12);
  const proctorId = null;
  const scheduledAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
  const examStatus = "scheduled";

  const proctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: assessment.id,
        body: {
          assessment_id: assessment.id,
          exam_session_id: examSessionId,
          proctor_id: proctorId,
          scheduled_at: scheduledAt,
          status: examStatus,
        } satisfies IEnterpriseLmsProctoredExam.ICreate,
      },
    );
  typia.assert(proctoredExam);

  // 8. Delete the created Proctored Exam as Department Manager
  await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.eraseProctoredExam(
    connection,
    {
      assessmentId: assessment.id,
      proctoredExamId: proctoredExam.id,
    },
  );

  // 9. Verify deletion by attempting to fetch the deleted Proctored Exam (expect error)
  await TestValidator.error(
    "deleted proctored exam fetch should fail",
    async () => {
      // Note: The GET endpoint is not provided, we simulate fetch by attempting erasure again (which will 404)
      // as no GET function to test deletion directly.
      await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.eraseProctoredExam(
        connection,
        {
          assessmentId: assessment.id,
          proctoredExamId: proctoredExam.id,
        },
      );
    },
  );
}
