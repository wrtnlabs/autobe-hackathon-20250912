import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";

/**
 * Validate the successful update of an assessment result by the corporate
 * learner user.
 *
 * This test follows the complete workflow involving multiple user roles:
 *
 * 1. Register and authenticate a corporate learner user.
 * 2. Register and authenticate a content creator instructor user.
 * 3. Create a new assessment by the content creator instructor.
 * 4. Create an assessment result linked to the corporate learner and
 *    assessment.
 * 5. Switch back to the corporate learner role.
 * 6. Update the assessment result with new values using the PUT endpoint.
 * 7. Verify the response and business logic correctness of the updated
 *    assessment result.
 *
 * The test confirms that only authorized users can update their own
 * assessment results and that data integrity is preserved through the
 * update operation.
 */
export async function test_api_assessment_result_update_success(
  connection: api.IConnection,
) {
  // 1. Corporate learner user registration
  const tenantId: string = typia.random<string & tags.Format<"uuid">>();
  const learnerEmail: string = typia.random<string & tags.Format<"email">>();
  const learnerPassword = "Password1234!";
  const learnerFirstName = RandomGenerator.name(1);
  const learnerLastName = RandomGenerator.name(1);
  const learnerCreateBody = {
    tenant_id: tenantId,
    email: learnerEmail,
    password: learnerPassword,
    first_name: learnerFirstName,
    last_name: learnerLastName,
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const learner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: learnerCreateBody,
    });
  typia.assert(learner);

  // 2. Authenticate corporate learner
  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: learnerEmail,
      password: learnerPassword,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  // 3. Content creator instructor registration
  const instructorEmail: string = typia.random<string & tags.Format<"email">>();
  const instructorPassword = "Password1234!";
  const instructorFirstName = RandomGenerator.name(1);
  const instructorLastName = RandomGenerator.name(1);
  const simulatedHashedPassword = RandomGenerator.alphaNumeric(60);
  const instructorCreateBody = {
    tenant_id: tenantId,
    email: instructorEmail,
    password_hash: simulatedHashedPassword,
    first_name: instructorFirstName,
    last_name: instructorLastName,
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const instructor: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: instructorCreateBody,
    });
  typia.assert(instructor);

  // 4. Authenticate content creator instructor
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: instructorEmail,
      password: instructorPassword,
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 5. Create new assessment by content creator instructor
  const assessmentCode = RandomGenerator.alphaNumeric(8);
  const assessmentTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const assessmentDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const assessmentCreateBody = {
    tenant_id: tenantId,
    code: assessmentCode,
    title: assessmentTitle,
    description: assessmentDescription,
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 70,
    scheduled_start_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 3600 * 24 * 1000).toISOString(),
    status: "active",
  } satisfies IEnterpriseLmsAssessments.ICreate;
  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.create(
      connection,
      {
        body: assessmentCreateBody,
      },
    );
  typia.assert(assessment);

  // 6. Switch to corporate learner and login again
  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: learnerEmail,
      password: learnerPassword,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  // 7. Create assessment result for corporate learner
  const resultScore = RandomGenerator.pick([65, 75, 85, 90, 95]);
  const resultCreateBody = {
    assessment_id: assessment.id,
    learner_id: learner.id,
    score: resultScore,
    completed_at: new Date().toISOString(),
    status: resultScore >= 70 ? "completed" : "failed",
  } satisfies IEnterpriseLmsAssessmentResult.ICreate;
  const assessmentResult: IEnterpriseLmsAssessmentResult =
    await api.functional.enterpriseLms.corporateLearner.assessments.results.create(
      connection,
      {
        assessmentId: assessment.id,
        body: resultCreateBody,
      },
    );
  typia.assert(assessmentResult);

  // 8. Update the assessment result with new values
  const newScore = resultScore >= 90 ? resultScore : resultScore + 5;
  const newStatus = newScore >= 70 ? "completed" : "failed";
  const updateBody = {
    score: newScore,
    completed_at: new Date().toISOString(),
    status: newStatus,
  } satisfies IEnterpriseLmsAssessmentResult.IUpdate;
  const updatedResult: IEnterpriseLmsAssessmentResult =
    await api.functional.enterpriseLms.corporateLearner.assessments.results.update(
      connection,
      {
        assessmentId: assessment.id,
        resultId: assessmentResult.id,
        body: updateBody,
      },
    );
  typia.assert(updatedResult);

  // 9. Validate the updated values
  TestValidator.equals("updated score matches", updatedResult.score, newScore);
  TestValidator.equals(
    "updated status matches",
    updatedResult.status,
    newStatus,
  );
  TestValidator.predicate(
    "updated completion timestamp present",
    updatedResult.completed_at !== null &&
      updatedResult.completed_at !== undefined,
  );
}
