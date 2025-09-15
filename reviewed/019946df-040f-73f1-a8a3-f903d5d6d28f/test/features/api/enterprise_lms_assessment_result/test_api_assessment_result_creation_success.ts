import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * E2E test for creating a new assessment result by an organization
 * administrator.
 *
 * This test performs the full workflow of organization admin user creation,
 * authentication, assessment creation, learner creation, and finally
 * creating an assessment result linked correctly to tenant, assessment, and
 * learner.
 *
 * Validations ensure the API response returns accurate persisted data,
 * enforcing business rules and authorization.
 */
export async function test_api_assessment_result_creation_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate organizationAdmin user via join
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminAuthorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: adminEmail,
        password: "password1234",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Login as the organizationAdmin
  const adminLogin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: "password1234",
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Create an assessment under the tenant
  const assessmentCreateBody = {
    tenant_id: tenantId,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    assessment_type: RandomGenerator.pick([
      "quiz",
      "survey",
      "peer review",
      "practical assignment",
    ] as const),
    max_score: 100,
    passing_score: 60,
    scheduled_start_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    scheduled_end_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      { body: assessmentCreateBody },
    );
  typia.assert(assessment);

  // 4. Create a corporate learner user within the tenant
  const learnerCreateBody = {
    tenant_id: tenantId,
    email: typia.random<string & tags.Format<"email">>(),
    password: "learnerpassword",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const learner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.createCorporatelearners(
      connection,
      { body: learnerCreateBody },
    );
  typia.assert(learner);

  // 5. Use POST endpoint to create a new assessment result for the learner
  const assessmentResultCreateBody = {
    assessment_id: assessment.id,
    learner_id: learner.id,
    score: 85,
    completed_at: new Date().toISOString(),
    status: "completed",
  } satisfies IEnterpriseLmsAssessmentResult.ICreate;

  const assessmentResult: IEnterpriseLmsAssessmentResult =
    await api.functional.enterpriseLms.organizationAdmin.assessments.results.create(
      connection,
      {
        assessmentId: assessment.id,
        body: assessmentResultCreateBody,
      },
    );
  typia.assert(assessmentResult);

  // Validate returned assessment result data
  TestValidator.equals(
    "created assessment result assessment_id matches",
    assessmentResult.assessment_id,
    assessment.id,
  );
  TestValidator.equals(
    "created assessment result learner_id matches",
    assessmentResult.learner_id,
    learner.id,
  );
  TestValidator.equals(
    "created assessment result score matches",
    assessmentResult.score,
    85,
  );
  TestValidator.equals(
    "created assessment result status matches",
    assessmentResult.status,
    "completed",
  );
  TestValidator.predicate(
    "created assessment result completed_at is ISO string",
    typeof assessmentResult.completed_at === "string" &&
      assessmentResult.completed_at !== null &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
        assessmentResult.completed_at,
      ),
  );
}
