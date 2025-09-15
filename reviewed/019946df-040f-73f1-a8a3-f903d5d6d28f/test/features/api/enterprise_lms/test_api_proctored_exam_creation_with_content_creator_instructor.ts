import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";

/**
 * E2E test for contentCreatorInstructor creating a proctored exam linked to an
 * assessment. Steps:
 *
 * 1. Register and login as contentCreatorInstructor user.
 * 2. Register and login as organizationAdmin user to create assessment in same
 *    tenant.
 * 3. Create assessment using organizationAdmin.
 * 4. Create proctored exam linked to the created assessment using
 *    contentCreatorInstructor.
 * 5. Validate all responses and business rules.
 * 6. Test error scenarios for invalid assessmentId.
 */
export async function test_api_proctored_exam_creation_with_content_creator_instructor(
  connection: api.IConnection,
) {
  // 1. Register contentCreatorInstructor user
  const contentCreatorEmail = typia.random<string & tags.Format<"email">>();
  const contentCreatorPassword = "ComplexPass123!";
  const contentCreatorTenantId = typia.random<string & tags.Format<"uuid">>();

  const contentCreatorCreateBody = {
    tenant_id: contentCreatorTenantId,
    email: contentCreatorEmail,
    password_hash: "hashedpassword" + RandomGenerator.alphaNumeric(8),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const contentCreatorAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorCreateBody,
    });
  typia.assert(contentCreatorAuthorized);

  // Immediately login
  const contentCreatorLoginBody = {
    email: contentCreatorEmail,
    password: contentCreatorPassword,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: contentCreatorLoginBody,
  });

  // 2. Register organizationAdmin in same tenant
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "ComplexPass123!";

  const orgAdminCreateBody = {
    tenant_id: contentCreatorTenantId,
    email: orgAdminEmail,
    password: orgAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdminAuthorized = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminCreateBody },
  );
  typia.assert(orgAdminAuthorized);

  // Login org admin
  const orgAdminLoginBody = {
    email: orgAdminEmail,
    password: orgAdminPassword,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAdminLoginBody,
  });

  // 3. Create assessment in tenant
  const assessmentCode = `CODE-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const assessmentTitle = `Title of ${RandomGenerator.name(2)}`;
  const assessmentCreateBody = {
    tenant_id: contentCreatorTenantId,
    code: assessmentCode,
    title: assessmentTitle,
    description: RandomGenerator.content({ paragraphs: 1 }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 70,
    scheduled_start_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    scheduled_end_at: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const createdAssessment =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      { body: assessmentCreateBody },
    );
  typia.assert(createdAssessment);

  // 4. Create Proctored Exam linked to assessment using contentCreatorInstructor role
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: contentCreatorLoginBody,
  });

  const proctoredExamCreateBody = {
    assessment_id: createdAssessment.id,
    exam_session_id: `SESSION-${RandomGenerator.alphaNumeric(8)}`,
    proctor_id: null,
    scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    status: "scheduled",
  } satisfies IEnterpriseLmsProctoredExam.ICreate;

  const createdProctoredExam =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: createdAssessment.id,
        body: proctoredExamCreateBody,
      },
    );

  typia.assert(createdProctoredExam);
  TestValidator.equals(
    "assessment_id matches",
    createdProctoredExam.assessment_id,
    createdAssessment.id,
  );
  TestValidator.equals(
    "status is scheduled",
    createdProctoredExam.status,
    "scheduled",
  );

  // 5. Error cases - attempt to create proctored exam with invalid assessmentId
  const invalidUuid = "00000000-0000-0000-0000-000000000000";

  await TestValidator.error(
    "cannot create proctored exam with invalid assessment id",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.create(
        connection,
        {
          assessmentId: invalidUuid,
          body: {
            assessment_id: invalidUuid,
            exam_session_id: `SESSION-INVALID`,
            proctor_id: null,
            scheduled_at: new Date(
              Date.now() + 1000 * 60 * 60 * 2,
            ).toISOString(),
            status: "scheduled",
          } satisfies IEnterpriseLmsProctoredExam.ICreate,
        },
      );
    },
  );
}
