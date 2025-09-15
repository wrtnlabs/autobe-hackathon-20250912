import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

/**
 * This test validates the retrieval of detailed assessment information for a
 * content creator or instructor user within the appropriate tenant context.
 *
 * The test includes registration and login of a content creator/instructor
 * user, creation of an assessment, retrieval of the assessment details,
 * validation of tenant association and assessment properties, and verification
 * of failure scenarios related to authorization and tenant isolation.
 */
export async function test_api_assessment_detail_content_creator_instructor(
  connection: api.IConnection,
) {
  // 1. Register content creator/instructor user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const userEmail = `testuser_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const passwordRaw = "P@ssw0rd!";
  // Emulate hashing the password (force proper test string)
  const passwordHash = `hashed-${passwordRaw}`;

  const contentCreatorUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenantId,
        email: userEmail,
        password_hash: passwordHash,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(contentCreatorUser);
  TestValidator.equals(
    "join tenant_id",
    contentCreatorUser.tenant_id,
    tenantId,
  );
  TestValidator.equals("join email", contentCreatorUser.email, userEmail);

  // 2. Login content creator/instructor user
  const loggedInUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: {
        email: userEmail,
        password: passwordRaw,
      } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
    });
  typia.assert(loggedInUser);
  TestValidator.equals("login tenant_id", loggedInUser.tenant_id, tenantId);
  TestValidator.equals("login email", loggedInUser.email, userEmail);
  // Headers of connection are set automatically by SDK to include token.access

  // 3. Create a new assessment under tenant
  const uniqueCode = `CODE-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const assessmentCreateBody = {
    tenant_id: tenantId,
    code: uniqueCode,
    title: `Test Assessment ${RandomGenerator.name(3)}`,
    assessment_type: RandomGenerator.pick([
      "quiz",
      "survey",
      "peer-review",
      "practical",
    ] as const),
    max_score: 100,
    passing_score: 60,
    status: "planned",
    description: `Description ${RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 8 })}`,
    scheduled_start_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // schedule 1 hour from now
    scheduled_end_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // schedule 24 hours from now
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const createdAssessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.create(
      connection,
      { body: assessmentCreateBody },
    );
  typia.assert(createdAssessment);
  // Validate returned data
  TestValidator.equals(
    "assessment tenant_id",
    createdAssessment.tenant_id,
    tenantId,
  );
  TestValidator.equals("assessment code", createdAssessment.code, uniqueCode);
  TestValidator.equals(
    "assessment title",
    createdAssessment.title,
    assessmentCreateBody.title,
  );
  TestValidator.equals(
    "assessment type",
    createdAssessment.assessment_type,
    assessmentCreateBody.assessment_type,
  );
  TestValidator.equals(
    "assessment max_score",
    createdAssessment.max_score,
    100,
  );
  TestValidator.equals(
    "assessment passing_score",
    createdAssessment.passing_score,
    60,
  );
  TestValidator.equals(
    "assessment status",
    createdAssessment.status,
    "planned",
  );
  TestValidator.equals(
    "assessment description",
    createdAssessment.description ?? null,
    assessmentCreateBody.description ?? null,
  );

  // 4. Retrieve the assessment details
  const retrievedAssessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.at(
      connection,
      {
        assessmentId: createdAssessment.id,
      },
    );
  typia.assert(retrievedAssessment);
  // Validate equality with created data
  TestValidator.equals(
    "retrieved tenant_id",
    retrievedAssessment.tenant_id,
    tenantId,
  );
  TestValidator.equals("retrieved code", retrievedAssessment.code, uniqueCode);
  TestValidator.equals(
    "retrieved title",
    retrievedAssessment.title,
    assessmentCreateBody.title,
  );
  TestValidator.equals(
    "retrieved assessment_type",
    retrievedAssessment.assessment_type,
    assessmentCreateBody.assessment_type,
  );

  TestValidator.equals(
    "retrieved max_score",
    retrievedAssessment.max_score,
    100,
  );
  TestValidator.equals(
    "retrieved passing_score",
    retrievedAssessment.passing_score,
    60,
  );
  TestValidator.equals(
    "retrieved status",
    retrievedAssessment.status,
    "planned",
  );

  TestValidator.equals(
    "retrieved description",
    retrievedAssessment.description ?? null,
    assessmentCreateBody.description ?? null,
  );

  // 5. Failure scenarios

  // 5.1 Unauthorized access - clearing the Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.at(
      unauthConn,
      {
        assessmentId: createdAssessment.id,
      },
    );
  });

  // 5.2 Invalid or non-existent assessmentId
  await TestValidator.error("invalid assessmentId should fail", async () => {
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.at(
      connection,
      {
        assessmentId: typia.random<string & tags.Format<"uuid">>(), // random id unlikely to exist
      },
    );
  });

  // 5.3 Tenant Isolation - user logged into one tenant tries to fetch from another
  const otherTenantId = typia.random<string & tags.Format<"uuid">>();
  const otherTenantAssessmentBody = {
    ...assessmentCreateBody,
    tenant_id: otherTenantId,
    code: `CODE-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
  } satisfies IEnterpriseLmsAssessments.ICreate;

  // Create an assessment in a different tenant
  const otherTenantAssessment =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.create(
      connection,
      { body: otherTenantAssessmentBody },
    );
  typia.assert(otherTenantAssessment);

  // Try fetching other tenant's assessment using original tenant's credentials
  await TestValidator.error("tenant mismatch access should fail", async () => {
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.at(
      connection,
      {
        assessmentId: otherTenantAssessment.id,
      },
    );
  });
}
