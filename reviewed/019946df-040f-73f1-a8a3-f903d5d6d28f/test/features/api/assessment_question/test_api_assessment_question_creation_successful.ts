import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate the successful creation of a new assessment question by an
 * authenticated organizationAdmin user.
 *
 * Scenario steps:
 *
 * 1. Authenticate and create contentCreatorInstructor user.
 * 2. Create an assessment under contentCreatorInstructor tenant context.
 * 3. Authenticate and create organizationAdmin user.
 * 4. Create an assessment under organizationAdmin tenant context.
 * 5. Authenticate as organizationAdmin for API usage.
 * 6. Post a new question to the assessment created by organizationAdmin.
 * 7. Assert the returned question object matches posted data with correct
 *    assessment linkage.
 *
 * This test confirms JWT handling, tenant-aware contexts, and precise
 * question creation.
 */
export async function test_api_assessment_question_creation_successful(
  connection: api.IConnection,
) {
  // 1. Create Content Creator Instructor user and authenticate
  const contentCreatorTenantId = typia.random<string & tags.Format<"uuid">>();
  const contentCreatorEmail = RandomGenerator.alphaNumeric(10) + "@example.com";
  const contentCreatorPassword = RandomGenerator.alphaNumeric(12);
  const contentCreatorUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: contentCreatorTenantId,
        email: contentCreatorEmail,
        password_hash: contentCreatorPassword,
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(contentCreatorUser);

  // 2. Create an assessment as content creator instructor
  const contentCreatorAssessmentCode =
    RandomGenerator.alphaNumeric(8).toUpperCase();
  const contentCreatorAssessmentBody = {
    tenant_id: contentCreatorTenantId,
    code: contentCreatorAssessmentCode,
    title: "Content Creator Assessment " + RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 1 }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 70,
    scheduled_start_at: new Date().toISOString(),
    scheduled_end_at: null,
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;
  const contentCreatorAssessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.create(
      connection,
      {
        body: contentCreatorAssessmentBody,
      },
    );
  typia.assert(contentCreatorAssessment);

  // 3. Create Organization Admin user and authenticate
  const organizationAdminTenantId = typia.random<
    string & tags.Format<"uuid">
  >();
  const organizationAdminEmail =
    RandomGenerator.alphaNumeric(10) + "@example.org";
  const organizationAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminUser: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: organizationAdminTenantId,
        email: organizationAdminEmail,
        password: organizationAdminPassword,
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdminUser);

  // 4. Create an assessment as organization admin
  const orgAdminAssessmentCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const orgAdminAssessmentBody = {
    tenant_id: organizationAdminTenantId,
    code: orgAdminAssessmentCode,
    title: "Org Admin Assessment " + RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 1 }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 80,
    scheduled_start_at: new Date().toISOString(),
    scheduled_end_at: null,
    status: "active",
  } satisfies IEnterpriseLmsAssessments.ICreate;
  const orgAdminAssessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      {
        body: orgAdminAssessmentBody,
      },
    );
  typia.assert(orgAdminAssessment);

  // 5. Authenticate as organizationAdmin user for API operations (login again to ensure token set)
  const orgAdminLogin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: organizationAdminEmail,
        password: organizationAdminPassword,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(orgAdminLogin);

  // 6. Create a new question under the assessment created by organization admin
  const questionText = "What is the capital city of South Korea?";
  const questionTypeCandidates = [
    "multiple choice",
    "true/false",
    "essay",
    "practical",
  ] as const;
  const questionType = RandomGenerator.pick(questionTypeCandidates);
  const questionWeight = RandomGenerator.pick([5, 10]);
  const createQuestionBody = {
    assessment_id: orgAdminAssessment.id,
    question_text: questionText,
    question_type: questionType,
    weight: questionWeight,
  } satisfies IEnterpriseLmsAssessmentQuestion.ICreate;

  const createdQuestion: IEnterpriseLmsAssessmentQuestion =
    await api.functional.enterpriseLms.organizationAdmin.assessments.questions.create(
      connection,
      {
        assessmentId: orgAdminAssessment.id,
        body: createQuestionBody,
      },
    );
  typia.assert(createdQuestion);

  // 7. Validate returned question data
  TestValidator.equals(
    "assessment question: assessment_id",
    createdQuestion.assessment_id,
    orgAdminAssessment.id,
  );
  TestValidator.equals(
    "assessment question: question_text",
    createdQuestion.question_text,
    questionText,
  );
  TestValidator.equals(
    "assessment question: question_type",
    createdQuestion.question_type,
    questionType,
  );
  TestValidator.equals(
    "assessment question: weight",
    createdQuestion.weight,
    questionWeight,
  );
}
