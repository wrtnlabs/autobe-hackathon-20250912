import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Test the deletion of an assessment result with valid assessmentId and
 * resultId parameters while ensuring authorization as systemAdmin. The test
 * flow includes:
 *
 * 1. Authenticating as systemAdmin using join or login endpoints;
 * 2. Creating necessary dependent resources including an assessment and an
 *    assessment result;
 * 3. Performing the DELETE operation on the assessment result;
 * 4. Verifying the result is deleted successfully;
 * 5. Attempting to delete with invalid IDs verifying correct error responses such
 *    as 404 Not Found;
 * 6. Ensuring unauthorized attempts are rejected with appropriate authentication
 *    errors. Business rules include verifying that deletion is a hard delete
 *    and that the resource no longer exists post deletion. Success criteria
 *    include API responding with correct HTTP status codes for both successful
 *    and error scenarios and confirming proper authorization workflow.
 */
export async function test_api_assessment_result_deletion_with_authorization_and_invalid_id_handling(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as systemAdmin user
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // 2. Create a new assessment
  const assessmentCreateBody = {
    tenant_id: systemAdmin.tenant_id,
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 70,
    scheduled_start_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    scheduled_end_at: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      { body: assessmentCreateBody },
    );
  typia.assert(assessment);

  // 3. Create an assessment result under the created assessment
  const assessmentResultCreateBody = {
    assessment_id: assessment.id,
    learner_id: typia.random<string & tags.Format<"uuid">>(),
    score: 85,
    completed_at: new Date().toISOString(),
    status: "completed",
  } satisfies IEnterpriseLmsAssessmentResult.ICreate;

  const assessmentResult: IEnterpriseLmsAssessmentResult =
    await api.functional.enterpriseLms.systemAdmin.assessments.results.create(
      connection,
      {
        assessmentId: assessment.id,
        body: assessmentResultCreateBody,
      },
    );
  typia.assert(assessmentResult);

  // 4. Delete the created assessment result
  await api.functional.enterpriseLms.systemAdmin.assessments.results.erase(
    connection,
    {
      assessmentId: assessment.id,
      resultId: assessmentResult.id,
    },
  );

  // 5. Attempting to delete again should produce 404 Not Found error
  await TestValidator.error(
    "Deleting a non-existent assessment result should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.results.erase(
        connection,
        {
          assessmentId: assessment.id,
          resultId: assessmentResult.id,
        },
      );
    },
  );

  // 6. Attempt deleting with invalid IDs - expect a 404 error
  const invalidUuid1 = "00000000-0000-0000-0000-000000000000";
  const invalidUuid2 = "11111111-1111-1111-1111-111111111111";

  await TestValidator.error(
    "Deleting with invalid assessmentId and resultId should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.results.erase(
        connection,
        {
          assessmentId: invalidUuid1,
          resultId: invalidUuid2,
        },
      );
    },
  );

  // 7. Test unauthorized deletion attempt
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Unauthorized deletion attempt should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.results.erase(
        unauthenticatedConnection,
        {
          assessmentId: assessment.id,
          resultId: assessmentResult.id,
        },
      );
    },
  );
}
