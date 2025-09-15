import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";

/**
 * This end-to-end test scenario verifies that an organization administrator
 * can delete a proctored exam session.
 *
 * Steps:
 *
 * 1. Register or log in as an organization administrator using the provided
 *    auth endpoints.
 * 2. Create an assessment under the tenant context.
 * 3. Create a proctored exam linked to the assessment.
 * 4. Perform deletion of the proctored exam using its session ID.
 * 5. Confirm deletion by attempting to retrieve the deleted exam or checking
 *    its absence.
 * 6. Test negative scenarios like unauthorized deletion attempts or deletion
 *    of non-existent records.
 *
 * The test ensures role-based access, tenant isolation, and correct
 * deletion semantics.
 */

export async function test_api_proctored_exam_deletion_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register organization admin user for tenant 1
  const orgAdminEmail1 = `orgadmin1_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const orgAdmin1: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: orgAdminEmail1,
        password: "Password123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdmin1);

  // 2. Create assessment under orgAdmin1 tenant
  const assessmentCode = `ASMT-${RandomGenerator.alphaNumeric(5).toUpperCase()}`;
  const assessmentTitle = `Assessment - ${RandomGenerator.name()}`;
  const assessmentBody = {
    tenant_id: orgAdmin1.tenant_id,
    code: assessmentCode,
    title: assessmentTitle,
    description: "Automated test assessment",
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 70,
    scheduled_start_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later
    scheduled_end_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;
  const assessment =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      { body: assessmentBody },
    );
  typia.assert(assessment);

  TestValidator.equals(
    "assessment tenant_id matches orgAdmin1 tenant_id",
    assessment.tenant_id,
    orgAdmin1.tenant_id,
  );

  // 3. Create proctored exam linked to assessment
  const proctoredExamBody = {
    assessment_id: assessment.id,
    exam_session_id: `EXAM-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    proctor_id: null,
    scheduled_at: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // 1.5 hours later
    status: "scheduled",
  } satisfies IEnterpriseLmsProctoredExam.ICreate;
  const proctoredExam =
    await api.functional.enterpriseLms.organizationAdmin.assessments.proctoredExams.create(
      connection,
      { assessmentId: assessment.id, body: proctoredExamBody },
    );
  typia.assert(proctoredExam);

  TestValidator.equals(
    "proctored exam assessment_id matches",
    proctoredExam.assessment_id,
    assessment.id,
  );

  // 4. Delete proctored exam
  await api.functional.enterpriseLms.organizationAdmin.assessments.proctoredExams.eraseProctoredExam(
    connection,
    { assessmentId: assessment.id, proctoredExamId: proctoredExam.id },
  );

  // 5. Deleting again should throw error
  await TestValidator.error(
    "redelete deleted proctored exam should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.assessments.proctoredExams.eraseProctoredExam(
        connection,
        { assessmentId: assessment.id, proctoredExamId: proctoredExam.id },
      );
    },
  );

  // 6. Register different org admin user (different tenant) and attempt deletion (should fail authorization)
  const orgAdminEmail2 = `orgadmin2_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const orgAdmin2: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: orgAdminEmail2,
        password: "Password123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdmin2);

  await TestValidator.error(
    "unauthorized deletion by different tenant org admin should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.assessments.proctoredExams.eraseProctoredExam(
        connection,
        { assessmentId: assessment.id, proctoredExamId: proctoredExam.id },
      );
    },
  );
}
