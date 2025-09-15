import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * Test the creation of an assessment result by a system administrator.
 *
 * The test workflow includes:
 *
 * 1. Creating and authenticating a systemAdmin user to obtain authorization.
 * 2. Creating a tenant organization.
 * 3. Creating an assessment associated with the tenant.
 * 4. Creating and authenticating a corporateLearner user linked to the tenant.
 * 5. Posting an assessment result for the corporate learner under the
 *    assessment.
 * 6. Validating that the returned assessment result data matches expected
 *    values.
 * 7. Verifying the timestamps in the response are valid ISO 8601 date-time
 *    strings.
 *
 * This test confirms proper authorization, data integrity, and tenant
 * isolation for creating assessment results.
 */
export async function test_api_system_admin_assessment_result_creation(
  connection: api.IConnection,
) {
  // 1. Create and authenticate systemAdmin user
  const systemAdminCreateBody = {
    email: RandomGenerator.alphaNumeric(8).toLowerCase() + "@systemadmin.test",
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Create tenant organization
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: "Tenant " + RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IEnterpriseLmsTenant.ICreate;
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 3. Create assessment entity for the tenant
  const assessmentCreateBody = {
    tenant_id: tenant.id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    title: "Assessment " + RandomGenerator.paragraph({ sentences: 2 }),
    description: "Description " + RandomGenerator.content({ paragraphs: 1 }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    scheduled_start_at: new Date().toISOString(),
    scheduled_end_at: new Date(Date.now() + 86400000).toISOString(),
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

  // 4. Create and authenticate corporateLearner user linked to tenant
  const corporateLearnerCreateBody = {
    tenant_id: tenant.id,
    email:
      RandomGenerator.alphaNumeric(8).toLowerCase() + "@corporatelearner.test",
    password: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: corporateLearnerCreateBody,
    });
  typia.assert(corporateLearner);

  // 5. Authenticate corporateLearner user to establish auth context
  const corporateLearnerLoginBody = {
    email: corporateLearnerCreateBody.email,
    password: corporateLearnerCreateBody.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;
  const corporateLearnerLogin: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: corporateLearnerLoginBody,
    });
  typia.assert(corporateLearnerLogin);

  // 6. Switch back to systemAdmin authorization context for posting result
  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const systemAdminLogin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminLogin);

  // 7. Post assessment result for the corporate learner
  const assessmentResultCreateBody = {
    assessment_id: assessment.id,
    learner_id: corporateLearner.id,
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

  // 8. Validate response fields match what was sent
  TestValidator.equals(
    "assessment id matches",
    assessmentResult.assessment_id,
    assessment.id,
  );
  TestValidator.equals(
    "learner id matches",
    assessmentResult.learner_id,
    corporateLearner.id,
  );
  TestValidator.equals("score matches", assessmentResult.score, 85);
  TestValidator.equals("status matches", assessmentResult.status, "completed");

  // 9. Validate response timestamps
  TestValidator.predicate(
    "created_at is valid date",
    !Number.isNaN(Date.parse(assessmentResult.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !Number.isNaN(Date.parse(assessmentResult.updated_at)),
  );
}
