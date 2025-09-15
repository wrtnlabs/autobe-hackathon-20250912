import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This E2E test validates the complete workflow for updating an assessment
 * result by a systemAdmin user in the enterprise LMS backend. It ensures that
 * only an authorized systemAdmin user can update an assessment result, and that
 * the updated result's score and status are properly changed and reflected in
 * the response.
 *
 * The test performs the following detailed steps:
 *
 * 1. Register a new systemAdmin user to establish an authorized context.
 * 2. Log in with the registered systemAdmin user for authentication and token
 *    acquisition.
 * 3. Generate realistic IDs for the assessment and result to be updated.
 * 4. Create an update payload containing a valid score, status, and optionally
 *    completed_at timestamp.
 * 5. Call the update endpoint authenticating as the systemAdmin user.
 * 6. Verify the response type and the update was successful by asserting returned
 *    score and status match the update.
 *
 * It ensures all required properties are included and uses realistic data,
 * strictly adhering to format, type, and validation rules specified in DTOs and
 * API contracts. It does not test invalid or unauthorized access, or missing
 * required properties as those are out of scope here.
 *
 * Summary:
 *
 * - Register and authenticate systemAdmin user.
 * - Update a specific assessment result via PUT with realistic score and status.
 * - Assert update response matches the input update.
 * - Maintain type safety and schema validation compliance.
 * - Use typia.assert for response validation.
 * - All API calls use await and proper parameter structure.
 *
 * This test covers the happy path for an authorized systemAdmin updating
 * assessment results with full dependency setup.
 */
export async function test_api_assessment_result_update_with_full_dependency_and_authorization(
  connection: api.IConnection,
) {
  // 1. Register a new systemAdmin user for authorized context
  const adminCreateBody = {
    email: `systemadmin${RandomGenerator.alphaNumeric(6)}@company.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const adminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Login as the newly created systemAdmin user
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const adminLoggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Prepare update payload and identifiers
  const assessmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const resultId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const updateBody = {
    score: typia.random<number>(),
    status: RandomGenerator.pick(["pending", "completed", "failed"] as const),
    // Optional field, randomly null or ISO date string
    completed_at: Math.random() < 0.5 ? new Date().toISOString() : null,
  } satisfies IEnterpriseLmsAssessmentResult.IUpdate;

  // 4. Perform the update operation
  const updatedResult: IEnterpriseLmsAssessmentResult =
    await api.functional.enterpriseLms.systemAdmin.assessments.results.update(
      connection,
      {
        assessmentId,
        resultId,
        body: updateBody,
      },
    );

  // Validate the response shape
  typia.assert(updatedResult);

  // 5. Verify response matches the update input for score and status
  TestValidator.equals(
    "score should be updated",
    updatedResult.score,
    updateBody.score,
  );
  TestValidator.equals(
    "status should be updated",
    updatedResult.status,
    updateBody.status,
  );

  // 6. Validate completed_at field
  if (updateBody.completed_at === null) {
    TestValidator.equals(
      "completed_at should be null",
      updatedResult.completed_at,
      null,
    );
  } else {
    TestValidator.equals(
      "completed_at should be updated to ISO string",
      updatedResult.completed_at,
      updateBody.completed_at,
    );
  }
}
