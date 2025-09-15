import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Full end-to-end test scenario to retrieve specific assessment result details
 * by system admin.
 *
 * This test covers:
 *
 * - SystemAdmin user join and login
 * - Assessment creation
 * - Creation of a mock assessment result
 * - Retrieval of assessment result detail using valid IDs
 * - Asserting received data complies with assessment result schema
 * - Error case testing for unauthorized access and non-existent IDs
 */
export async function test_api_assessment_result_detail_retrieval_by_system_admin(
  connection: api.IConnection,
) {
  // 1. systemAdmin user registration - join
  const adminCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@company.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const adminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. systemAdmin login with the same credentials
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loginAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Create an assessment resource for tenant
  const assessmentCreateBody = {
    tenant_id: adminAuthorized.tenant_id,
    code: RandomGenerator.alphaNumeric(10),
    title: "Assessment " + RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 1 }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    scheduled_start_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    scheduled_end_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    status: "active",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      { body: assessmentCreateBody },
    );
  typia.assert(assessment);

  // 4. Create a mock assessment result associated with the assessment
  // Since no API is provided for create assessment result, manually create data
  // Generate a random learner id and record score and status as completed
  const learnerId = typia.random<string & tags.Format<"uuid">>();
  const assessmentResult: IEnterpriseLmsAssessmentResult = {
    id: typia.random<string & tags.Format<"uuid">>(),
    assessment_id: assessment.id,
    learner_id: learnerId,
    score: 78,
    completed_at: new Date().toISOString(),
    status: "completed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IEnterpriseLmsAssessmentResult;

  // 5. Retrieve assessment result details with correct IDs
  const retrievedResult: IEnterpriseLmsAssessmentResult =
    await api.functional.enterpriseLms.systemAdmin.assessments.results.at(
      connection,
      { assessmentId: assessment.id, resultId: assessmentResult.id },
    );
  typia.assert(retrievedResult);

  TestValidator.equals(
    "assessment result ID",
    retrievedResult.id,
    assessmentResult.id,
  );
  TestValidator.equals(
    "assessment ID",
    retrievedResult.assessment_id,
    assessment.id,
  );
  TestValidator.equals(
    "learner ID",
    retrievedResult.learner_id,
    assessmentResult.learner_id,
  );
  TestValidator.predicate(
    "score is within valid range",
    retrievedResult.score >= 0 && retrievedResult.score <= assessment.max_score,
  );
  TestValidator.equals(
    "status is completed",
    retrievedResult.status,
    "completed",
  );

  // 6. Test retrieval attempt unauthorized (unauthenticated connection)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is denied", async () => {
    await api.functional.enterpriseLms.systemAdmin.assessments.results.at(
      unauthConnection,
      { assessmentId: assessment.id, resultId: assessmentResult.id },
    );
  });

  // 7. Test retrieval with non-existent assessmentId and resultId
  await TestValidator.error(
    "retrieval with non-existent IDs fails",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.results.at(
        connection,
        {
          assessmentId: typia.random<string & tags.Format<"uuid">>(),
          resultId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Note: Cleanup not implemented as test environment specifics are unknown
}
