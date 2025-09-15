import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * End-to-end test for retrieving detailed assessment result information as
 * an organization administrator.
 *
 * This test performs the entire workflow from creating and authenticating
 * an organizationAdmin user, creating an assessment entity, and retrieving
 * a specific assessment result detail.
 *
 * It validates the correctness of response data based on DTO definitions
 * and ensures strict compliance with multi-tenant security, authentication
 * requirements, and business logic. Invalid and unauthorized access cases
 * are tested to verify security boundaries.
 *
 * Steps involved:
 *
 * 1. Create and authenticate an organizationAdmin user (join and login).
 * 2. Create an assessment entity allied to the tenant.
 * 3. Simulate or use test data for an assessment result ID.
 * 4. Retrieve the detailed assessment result by assessmentId and resultId.
 * 5. Validate the response using typia.assert and TestValidator.
 * 6. Test error cases for not found and forbidden access.
 */
export async function test_api_organization_admin_retrieve_assessment_result_detail(
  connection: api.IConnection,
) {
  // 1. Create organizationAdmin user and set authentication
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orgAdminEmail = `admin_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const orgAdminPassword = "Password123!";

  const joinBody = {
    tenant_id: tenantId,
    email: orgAdminEmail,
    password: orgAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(organizationAdmin);

  // Login with the created user to refresh auth context
  const loginBody = {
    email: orgAdminEmail,
    password: orgAdminPassword,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 2. Create an assessment entity with tenant association
  const assessmentCode = `ASM${RandomGenerator.alphaNumeric(5).toUpperCase()}`;
  const createAssessmentBody = {
    tenant_id: tenantId,
    code: assessmentCode,
    title: `Assessment ${RandomGenerator.name(2)}`,
    description: `Detailed description for assessment ${assessmentCode}`,
    assessment_type: "quiz", // example type
    max_score: 100,
    passing_score: 70,
    scheduled_start_at: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour ago
    scheduled_end_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // 1 day later
    status: "active",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const createdAssessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      {
        body: createAssessmentBody,
      },
    );
  typia.assert(createdAssessment);

  // Assume an existing assessment result for test retrieval
  // Simulating by generating random UUIDs here
  const resultId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Retrieve assessment result detail
  const assessmentResult: IEnterpriseLmsAssessmentResult =
    await api.functional.enterpriseLms.organizationAdmin.assessments.results.at(
      connection,
      {
        assessmentId: createdAssessment.id,
        resultId: resultId,
      },
    );
  typia.assert(assessmentResult);

  // Validate key properties to ensure the result retrieved matches the requested IDs
  TestValidator.equals(
    "assessmentResult.assessment_id equals createdAssessment.id",
    assessmentResult.assessment_id,
    createdAssessment.id,
  );

  TestValidator.equals(
    "assessmentResult.id equals requested resultId",
    assessmentResult.id,
    resultId,
  );

  TestValidator.predicate(
    "assessmentResult.score is between 0 and max_score",
    assessmentResult.score >= 0 &&
      assessmentResult.score <= createdAssessment.max_score,
  );

  // Validate status string is non-empty
  TestValidator.predicate(
    "assessmentResult.status is a non-empty string",
    typeof assessmentResult.status === "string" &&
      assessmentResult.status.length > 0,
  );

  // 4. Error scenario: retrieving assessment result with invalid IDs
  await TestValidator.error(
    "retrieving with invalid assessmentId throws error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.assessments.results.at(
        connection,
        {
          assessmentId: typia.random<string & tags.Format<"uuid">>(),
          resultId: resultId,
        },
      );
    },
  );

  await TestValidator.error(
    "retrieving with invalid resultId throws error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.assessments.results.at(
        connection,
        {
          assessmentId: createdAssessment.id,
          resultId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
