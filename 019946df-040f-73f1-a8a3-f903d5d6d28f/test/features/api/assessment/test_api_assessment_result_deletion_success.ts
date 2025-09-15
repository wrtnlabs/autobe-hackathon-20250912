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
 * Verify deletion of an assessment result by an organization administrator.
 *
 * This test covers the entire workflow:
 *
 * 1. Organization admin user creation and login
 * 2. Assessment creation linked to admin's tenant
 * 3. Corporate learner creation
 * 4. Assessment result creation linking learner and assessment
 * 5. Deletion of the assessment result
 * 6. Verification that the assessment result is deleted
 *
 * Validates that an authorized admin can delete assessment results and that
 * deleted results are no longer retrievable.
 */
export async function test_api_assessment_result_deletion_success(
  connection: api.IConnection,
) {
  // 1. Organization admin user creation
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.alphaNumeric(10)}@example.org`,
    password: "password123",
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const admin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Authentication step - logging in is optional since join returns authorized, but login to simulate the flow
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create assessment linked to the tenant
  const assessmentCreateBody = {
    tenant_id: loggedInAdmin.tenant_id,
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(3),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    status: "active",
    scheduled_start_at: new Date().toISOString(),
    scheduled_end_at: new Date(Date.now() + 86400000).toISOString(),
  } satisfies IEnterpriseLmsAssessments.ICreate;
  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      { body: assessmentCreateBody },
    );
  typia.assert(assessment);

  // 4. Create a corporate learner in the same tenant
  const learnerCreateBody = {
    tenant_id: loggedInAdmin.tenant_id,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "learnerpwd",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const learner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.createCorporatelearners(
      connection,
      { body: learnerCreateBody },
    );
  typia.assert(learner);

  // 5. Create assessment result linked to assessment and learner
  const assessmentResultCreateBody = {
    assessment_id: assessment.id,
    learner_id: learner.id,
    score: 85,
    status: "completed",
    completed_at: new Date().toISOString(),
  } satisfies IEnterpriseLmsAssessmentResult.ICreate;
  const result: IEnterpriseLmsAssessmentResult =
    await api.functional.enterpriseLms.organizationAdmin.assessments.results.create(
      connection,
      {
        assessmentId: assessment.id,
        body: assessmentResultCreateBody,
      },
    );
  typia.assert(result);

  // 6. Delete the assessment result by IDs
  await api.functional.enterpriseLms.organizationAdmin.assessments.results.erase(
    connection,
    {
      assessmentId: assessment.id,
      resultId: result.id,
    },
  );

  // 7. Attempt to delete again should raise error
  await TestValidator.error(
    "deleting non-existent assessment result should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.assessments.results.erase(
        connection,
        {
          assessmentId: assessment.id,
          resultId: result.id,
        },
      );
    },
  );
}
