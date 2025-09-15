import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";

export async function test_api_assessment_proctored_exam_detail_access_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a content creator/instructor user
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordHash = RandomGenerator.alphaNumeric(30); // simulated hashed password
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active" as const;

  const authorizedUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        status: status,
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(authorizedUser);

  // 2. Create an assessment with valid details
  const assessmentCode = RandomGenerator.alphaNumeric(10);
  const assessmentTitle = RandomGenerator.name(3);
  const assessmentDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 8,
  });
  const assessmentType = "quiz";
  const maxScore = 100;
  const passingScore = 60;
  const statusAssessment = "planned";

  const createdAssessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.create(
      connection,
      {
        body: {
          tenant_id: tenantId,
          code: assessmentCode,
          title: assessmentTitle,
          description: assessmentDescription,
          assessment_type: assessmentType,
          max_score: maxScore,
          passing_score: passingScore,
          status: statusAssessment,
        } satisfies IEnterpriseLmsAssessments.ICreate,
      },
    );
  typia.assert(createdAssessment);

  // 3. Create a proctored exam session linked to the assessment
  const proctoredExamCreateBody: IEnterpriseLmsProctoredExam.ICreate = {
    assessment_id: createdAssessment.id,
    exam_session_id: RandomGenerator.alphaNumeric(15),
    proctor_id: null,
    scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    status: "scheduled",
  };

  const createdProctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: createdAssessment.id,
        body: proctoredExamCreateBody,
      },
    );
  typia.assert(createdProctoredExam);

  // 4. Retrieve the detailed proctored exam information by its UUID
  const retrievedProctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.at(
      connection,
      {
        assessmentId: createdAssessment.id,
        proctoredExamId: createdProctoredExam.id,
      },
    );
  typia.assert(retrievedProctoredExam);

  // 5. Validate that the retrieved proctored exam matches the created one
  TestValidator.equals(
    "Proctored exam 'id' matches created proctored exam",
    retrievedProctoredExam.id,
    createdProctoredExam.id,
  );
  TestValidator.equals(
    "Proctored exam 'assessment_id' matches assessment id",
    retrievedProctoredExam.assessment_id,
    createdAssessment.id,
  );
  TestValidator.equals(
    "Proctored exam 'exam_session_id' matches created data",
    retrievedProctoredExam.exam_session_id,
    createdProctoredExam.exam_session_id,
  );
  TestValidator.equals(
    "Proctored exam 'status' matches 'scheduled'",
    retrievedProctoredExam.status,
    "scheduled",
  );
}
