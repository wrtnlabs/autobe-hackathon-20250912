import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This E2E test validates the complete creation workflow of a proctored exam
 * under systemAdmin scope in Enterprise LMS.
 *
 * Steps:
 *
 * 1. Register a systemAdmin user with valid details.
 * 2. Authenticate this user to obtain access tokens.
 * 3. Create an assessment necessary for proctored exam association.
 * 4. Create a proctored exam linked to the assessment with valid session and
 *    proctor IDs.
 * 5. Validate all returned properties and formats in the created proctored exam.
 */
export async function test_api_proctored_exam_creation_with_valid_session_and_proctor(
  connection: api.IConnection,
) {
  // 1. Register systemAdmin user
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const adminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Login systemAdmin user
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginBody,
  });

  // 3. Create assessment
  const assessmentCreateBody = {
    tenant_id: adminAuthorized.tenant_id,
    code: `asm_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(3),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    status: "active",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      {
        body: assessmentCreateBody,
      },
    );
  typia.assert(assessment);

  // 4. Create proctored exam
  const proctoredExamCreateBody = {
    assessment_id: assessment.id,
    exam_session_id: `sess_${RandomGenerator.alphaNumeric(16)}`,
    proctor_id: `prctr_${RandomGenerator.alphaNumeric(8)}`,
    scheduled_at: new Date().toISOString(),
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

  // 5. Validate returned proctored exam data
  TestValidator.predicate(
    "proctored exam id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      proctoredExam.id,
    ),
  );
  TestValidator.equals(
    "proctored exam assessment_id matches",
    proctoredExam.assessment_id,
    assessment.id,
  );
  TestValidator.equals(
    "proctored exam status",
    proctoredExam.status,
    "scheduled",
  );
  TestValidator.predicate(
    "proctored exam scheduled_at is ISO string",
    typeof proctoredExam.scheduled_at === "string" &&
      proctoredExam.scheduled_at.length > 0,
  );
  TestValidator.predicate(
    "proctored exam created_at is ISO string",
    typeof proctoredExam.created_at === "string" &&
      proctoredExam.created_at.length > 0,
  );
  TestValidator.predicate(
    "proctored exam updated_at is ISO string",
    typeof proctoredExam.updated_at === "string" &&
      proctoredExam.updated_at.length > 0,
  );
}
