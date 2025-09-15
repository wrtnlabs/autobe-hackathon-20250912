import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";

/**
 * This E2E test validates the entire workflow for creating a proctored exam as
 * an organization administrator. The test includes registering and logging in
 * the organization admin user, creating an assessment, and subsequently
 * creating a proctored exam linked to that assessment.
 *
 * Steps:
 *
 * 1. Register an organizationAdmin user with a tenant ID.
 * 2. Login as the organizationAdmin user to obtain JWT tokens.
 * 3. Create a new assessment within the tenant organization.
 * 4. Create a proctored exam linked to the newly created assessment.
 *
 * The test verifies the proper response structure and fields at each step,
 * ensuring correct authorization context and business logic enforcement.
 */
export async function test_api_proctored_exam_creation_with_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register an organizationAdmin user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const orgAdminCreateBody = {
    tenant_id: tenantId,
    email: `orgadmin.${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "SecurePass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdminAuthorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdminAuthorized);
  TestValidator.equals(
    "organizationAdmin tenant_id matches",
    orgAdminAuthorized.tenant_id,
    tenantId,
  );

  // 2. Login as the registered organizationAdmin to get JWT tokens
  const orgAdminLoginBody = {
    email: orgAdminCreateBody.email,
    password: orgAdminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const orgAdminLogin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: orgAdminLoginBody,
    });
  typia.assert(orgAdminLogin);
  TestValidator.equals(
    "organizationAdmin login tenant_id matches",
    orgAdminLogin.tenant_id,
    tenantId,
  );

  // 3. Create a new assessment for the tenant organization
  const currentISOString = new Date().toISOString();
  const assessmentCreateBody = {
    tenant_id: tenantId,
    code: `TST-${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    title: `Assessment Title ${RandomGenerator.name(2)}`,
    assessment_type: RandomGenerator.pick(["quiz", "exam", "survey"] as const),
    max_score: 100,
    passing_score: 70,
    scheduled_start_at: currentISOString,
    scheduled_end_at: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 7,
    ).toISOString(), // One week later
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
    "assessment tenant_id matches",
    assessment.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "assessment code matches",
    assessment.code,
    assessmentCreateBody.code,
  );

  // 4. Create proctored exam linked to the assessment
  const proctoredExamCreateBody = {
    assessment_id: assessment.id,
    exam_session_id: `session-${RandomGenerator.alphaNumeric(8)}`,
    proctor_id: `proctor-${RandomGenerator.alphaNumeric(6)}`,
    scheduled_at: currentISOString,
    status: "scheduled",
  } satisfies IEnterpriseLmsProctoredExam.ICreate;

  const proctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.organizationAdmin.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: assessment.id,
        body: proctoredExamCreateBody,
      },
    );
  typia.assert(proctoredExam);
  TestValidator.equals(
    "proctoredExam assessment_id matches",
    proctoredExam.assessment_id,
    assessment.id,
  );
  TestValidator.equals(
    "proctoredExam exam_session_id matches",
    proctoredExam.exam_session_id,
    proctoredExamCreateBody.exam_session_id,
  );
  TestValidator.equals(
    "proctoredExam proctor_id matches",
    proctoredExam.proctor_id,
    proctoredExamCreateBody.proctor_id,
  );
  TestValidator.equals(
    "proctoredExam status is scheduled",
    proctoredExam.status,
    "scheduled",
  );
}
