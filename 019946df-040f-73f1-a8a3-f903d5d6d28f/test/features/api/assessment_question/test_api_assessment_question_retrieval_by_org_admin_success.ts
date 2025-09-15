import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This test validates that an organization administrator can retrieve the
 * details of an assessment question within their organizational context.
 *
 * Business context and test flow:
 *
 * 1. Authenticate as an organization administrator using the join API,
 *    establishing an authorized session.
 * 2. Create a new assessment entity under this admin's tenant.
 * 3. Create a question tied to the assessment.
 * 4. Although a retrieval API is expected to fetch the question details, no such
 *    GET endpoint is provided.
 * 5. This test therefore focuses on validating the creation and linking of the
 *    question to the assessment.
 *
 * The test ensures complete data integrity, proper authorization context, and
 * correctness of the creation API operations.
 */
export async function test_api_assessment_question_retrieval_by_org_admin_success(
  connection: api.IConnection,
) {
  // 1. Organization admin joins (registers and authenticates)
  const orgAdminCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: RandomGenerator.name(1).replace(/\s+/g, "") + "@example.com",
    password: "SecureP@ssw0rd",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdmin);

  // 2. Create assessment using the tenant_id from the admin
  const assessmentCreateBody = {
    tenant_id: orgAdmin.tenant_id,
    code: "ASSMT-" + RandomGenerator.alphaNumeric(8).toUpperCase(),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    scheduled_start_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
    scheduled_end_at: new Date(Date.now() + 3600 * 1000 * 24).toISOString(), // 24 hours from now
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      {
        body: assessmentCreateBody,
      },
    );
  typia.assert(assessment);

  TestValidator.equals(
    "assessment tenant_id",
    assessment.tenant_id,
    orgAdmin.tenant_id,
  );

  // 3. Create question for the assessment
  const questionCreateBody = {
    assessment_id: assessment.id,
    question_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 30,
    }),
    question_type: "multiple choice",
    weight: 10,
  } satisfies IEnterpriseLmsAssessmentQuestion.ICreate;

  const question: IEnterpriseLmsAssessmentQuestion =
    await api.functional.enterpriseLms.organizationAdmin.assessments.questions.create(
      connection,
      {
        assessmentId: assessment.id,
        body: questionCreateBody,
      },
    );
  typia.assert(question);

  TestValidator.equals(
    "question assessment_id",
    question.assessment_id,
    assessment.id,
  );
  TestValidator.equals(
    "question text",
    question.question_text,
    questionCreateBody.question_text,
  );
  TestValidator.equals(
    "question type",
    question.question_type,
    questionCreateBody.question_type,
  );

  // Note: Retrieval of the question by its assessmentId is not possible as no GET endpoint is provided.
  // Therefore, validation is based on creation response consistency.
}
