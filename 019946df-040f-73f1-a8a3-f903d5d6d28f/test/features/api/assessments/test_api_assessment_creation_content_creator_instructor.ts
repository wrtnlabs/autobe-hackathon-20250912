import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

/**
 * This end-to-end test validates the creation of an assessment by a content
 * creator or instructor within a tenant context. It ensures tenant isolation,
 * proper authentication, input validation, and error handling.
 *
 * The test flow includes:
 *
 * 1. Registering a new content creator/instructor user with required tenant and
 *    user details.
 * 2. Authenticating via login with valid credentials.
 * 3. Creating an assessment tied to the authenticated user's tenant.
 * 4. Verifying the created assessment response includes correct tenant association
 *    and properties.
 * 5. Testing failure behaviors for unauthenticated requests, invalid data, and
 *    tenant mismatch.
 */
export async function test_api_assessment_creation_content_creator_instructor(
  connection: api.IConnection,
) {
  // 1. Create a content creator/instructor with realistic data
  const tenant_id = typia.random<string & tags.Format<"uuid">>();
  const email = `testuser_${Date.now()}@example.com`;
  const password = "correcthorsebatterystaple";
  const password_hash = "hashedpassword_123"; // Simulate hashed password
  const first_name = RandomGenerator.name(1);
  const last_name = RandomGenerator.name(1);

  const userCreateBody = {
    tenant_id: tenant_id,
    email: email,
    password_hash: password_hash,
    first_name: first_name,
    last_name: last_name,
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const authorizedUser =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Login the content creator/instructor
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const loggedInUser = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedInUser);

  // 3. Create a valid assessment
  const now = new Date();
  const scheduledStartAt = new Date(now.getTime() + 3600 * 1000).toISOString(); // +1 hour
  const scheduledEndAt = new Date(now.getTime() + 7200 * 1000).toISOString(); // +2 hours

  const assessmentCreateBody = {
    tenant_id: authorizedUser.tenant_id,
    code: `CODE_${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    scheduled_start_at: scheduledStartAt,
    scheduled_end_at: scheduledEndAt,
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const createdAssessment =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.create(
      connection,
      { body: assessmentCreateBody },
    );
  typia.assert(createdAssessment);

  TestValidator.equals(
    "tenant_id of created matches authorized",
    createdAssessment.tenant_id,
    authorizedUser.tenant_id,
  );
  TestValidator.equals(
    "code matches input code",
    createdAssessment.code,
    assessmentCreateBody.code,
  );
  TestValidator.equals(
    "title matches input title",
    createdAssessment.title,
    assessmentCreateBody.title,
  );
  TestValidator.equals(
    "assessment_type matches",
    createdAssessment.assessment_type,
    assessmentCreateBody.assessment_type,
  );
  TestValidator.predicate(
    "created_at is valid string",
    typeof createdAssessment.created_at === "string" &&
      createdAssessment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid string",
    typeof createdAssessment.updated_at === "string" &&
      createdAssessment.updated_at.length > 0,
  );

  // 4. Attempt to create assessment without auth
  const unauthConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "create assessment without authentication should fail",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.create(
        unauthConnection,
        { body: assessmentCreateBody },
      );
    },
  );

  // 5. Attempt to create assessment with invalid data
  const invalidAssessmentBody = {
    tenant_id: authorizedUser.tenant_id,
    code: "",
    title: "",
    assessment_type: "",
    max_score: -1,
    passing_score: 120,
    status: "",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  await TestValidator.error(
    "create assessment with invalid fields should fail",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.create(
        connection,
        { body: invalidAssessmentBody },
      );
    },
  );

  // 6. Attempt to create assessment with mismatched tenant_id
  const mismatchedTenantId = typia.random<string & tags.Format<"uuid">>();
  const mismatchedAssessmentBody = {
    ...assessmentCreateBody,
    tenant_id: mismatchedTenantId,
  } satisfies IEnterpriseLmsAssessments.ICreate;

  await TestValidator.error(
    "create assessment with mismatched tenant_id should fail",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.create(
        connection,
        { body: mismatchedAssessmentBody },
      );
    },
  );
}
