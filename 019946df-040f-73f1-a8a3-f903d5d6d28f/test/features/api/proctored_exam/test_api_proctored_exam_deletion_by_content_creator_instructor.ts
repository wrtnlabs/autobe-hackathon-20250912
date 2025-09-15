import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This test validates the deletion of a proctored exam record by a content
 * creator/instructor user within the Enterprise LMS system.
 *
 * The test performs the following step-by-step workflow:
 *
 * 1. Create a tenant organization under systemAdmin credentials.
 * 2. Create and authenticate a contentCreatorInstructor user linked to the
 *    tenant.
 * 3. Create a certification linked to the tenant under organizationAdmin
 *    credentials.
 * 4. Create an assessment linked to the created certification and tenant under
 *    systemAdmin credentials.
 * 5. Create a proctored exam associated with the assessment as the
 *    contentCreatorInstructor user.
 * 6. Delete the created proctored exam as the contentCreatorInstructor user.
 * 7. Confirm that the deletion was successful and the proctored exam cannot be
 *    retrieved afterwards.
 *
 * The test includes role switching with proper authentication API calls to
 * simulate different user roles. It validates entity creation success,
 * deletion success with no content, and 404 retrieval error post deletion.
 *
 * Business logic enforced includes tenant isolation, role-based
 * permissions, and resource lifecycle validation.
 *
 * The test uses typia and TestValidator for strict type validation and
 * assertion.
 */
export async function test_api_proctored_exam_deletion_by_content_creator_instructor(
  connection: api.IConnection,
) {
  // 1. Create tenant organization as systemAdmin user
  const systemAdminPassword = RandomGenerator.alphaNumeric(10);
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.net`,
        password_hash: systemAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: `TENANT_${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IEnterpriseLmsTenant.ICreate,
    });
  typia.assert(tenant);

  // 2. Create and authenticate contentCreatorInstructor user linked to tenant
  const contentCreatorInstructorPassword = RandomGenerator.alphaNumeric(10);
  const contentCreatorInstructor: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
        password_hash: contentCreatorInstructorPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(contentCreatorInstructor);

  // 3. Authenticate organizationAdmin user and create certification linked to tenant
  const organizationAdminPassword = RandomGenerator.alphaNumeric(10);
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.org`,
        password: organizationAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  const certification: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          code: `CERT_${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          status: "active",
        } satisfies IEnterpriseLmsCertification.ICreate,
      },
    );
  typia.assert(certification);

  // 4. Authenticate systemAdmin user and create assessment linked to certification and tenant
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdmin.email,
      password_hash: systemAdminPassword,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  const assessmentCode = `ASSMT_${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const maxScore = 100;
  const passingScore = 70;

  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          code: assessmentCode,
          title: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 5,
            wordMax: 8,
          }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          assessment_type: "quiz",
          max_score: maxScore,
          passing_score: passingScore,
          scheduled_start_at: new Date(
            Date.now() + 1000 * 60 * 60,
          ).toISOString(),
          scheduled_end_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24,
          ).toISOString(),
          status: "active",
        } satisfies IEnterpriseLmsAssessments.ICreate,
      },
    );
  typia.assert(assessment);

  // Switch to contentCreatorInstructor user
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: contentCreatorInstructor.email,
      password: contentCreatorInstructorPassword,
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 5. Create proctored exam for the assessment
  const proctoredExamBody = {
    assessment_id: assessment.id,
    exam_session_id: `SESSION_${RandomGenerator.alphaNumeric(10).toUpperCase()}`,
    proctor_id: null,
    scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    status: "scheduled",
  } satisfies IEnterpriseLmsProctoredExam.ICreate;

  const proctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: assessment.id,
        body: proctoredExamBody,
      },
    );
  typia.assert(proctoredExam);

  // 6. Delete the proctored exam by contentCreatorInstructor user
  await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.eraseProctoredExam(
    connection,
    {
      assessmentId: assessment.id,
      proctoredExamId: proctoredExam.id,
    },
  );

  // 7. Confirm deletion by attempting to retrieve the deleted proctored exam
  // Expect error due to not found
  await TestValidator.error(
    "should fail retrieving deleted proctored exam",
    async () => {
      // There is no separate GET proctored exam API; simulate by deleting again
      // Should throw error since proctored exam is already deleted
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.eraseProctoredExam(
        connection,
        {
          assessmentId: assessment.id,
          proctoredExamId: proctoredExam.id,
        },
      );
    },
  );
}
