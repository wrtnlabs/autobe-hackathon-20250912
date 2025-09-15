import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This test validates the full workflow for a system administrator deleting a
 * proctored exam. It includes admin registration and authentication, assessment
 * creation, proctored exam creation, deletion, and validation of expected
 * failure cases.
 *
 * Steps:
 *
 * 1. Admin joins and authenticates
 * 2. Creates assessment with required fields
 * 3. Creates proctored exam linked to assessment
 * 4. Deletes the proctored exam by ID as system admin
 * 5. Checks successful deletion with no response
 * 6. Validates proper error when deleting a non-existent proctored exam
 * 7. Validates authorization error when deleting without authentication
 */
export async function test_api_proctored_exam_deletion_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate system admin
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create Assessment
  const assessmentCreateBody = {
    tenant_id: admin.tenant_id,
    code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      { body: assessmentCreateBody },
    );
  typia.assert(assessment);

  // 3. Create Proctored Exam linked to assessment
  const scheduledAt = new Date(Date.now() + 3600 * 1000).toISOString();
  const proctoredExamCreateBody = {
    assessment_id: assessment.id,
    exam_session_id: RandomGenerator.alphaNumeric(12),
    proctor_id: null,
    scheduled_at: scheduledAt,
    status: "scheduled",
  } satisfies IEnterpriseLmsProctoredExam.ICreate;

  const proctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: assessment.id,
        body: proctoredExamCreateBody,
      },
    );
  typia.assert(proctoredExam);

  // 4. Delete the proctored exam by ID
  await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.eraseProctoredExam(
    connection,
    {
      assessmentId: assessment.id,
      proctoredExamId: proctoredExam.id,
    },
  );

  // 5. Confirm deletions cannot be retrieved by attempting delete again
  await TestValidator.error(
    "deleting non-existent proctored exam should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.eraseProctoredExam(
        connection,
        {
          assessmentId: assessment.id,
          proctoredExamId: proctoredExam.id,
        },
      );
    },
  );

  // 6. Create unauthenticated connection for unauthorized deletion test
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Attempt deletion without authentication
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.eraseProctoredExam(
        unauthenticatedConnection,
        {
          assessmentId: assessment.id,
          proctoredExamId: proctoredExam.id,
        },
      );
    },
  );
}
