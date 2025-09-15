import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This test covers the successful workflow of a system administrator
 * registering, creating a tenant, creating an assessment under that tenant,
 * creating a proctored exam linked to the assessment, and finally retrieving
 * the proctored exam details.
 *
 * It validates that the creation responses return valid IDs and expected
 * fields, and that the retrieval endpoint returns the correct proctored exam
 * resource.
 *
 * The test also verifies that unauthorized access and invalid inputs are
 * properly rejected with appropriate errors.
 */
export async function test_api_proctored_exam_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. System administrator registration and authentication
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create a tenant organization
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 3. Create an assessment under the tenant
  const assessmentCreateBody = {
    tenant_id: tenant.id,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    scheduled_start_at: new Date(Date.now() + 30 * 60000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;
  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      { body: assessmentCreateBody },
    );
  typia.assert(assessment);

  // 4. Create a proctored exam linked to the assessment
  const proctoredExamCreateBody = {
    assessment_id: assessment.id,
    exam_session_id: RandomGenerator.alphaNumeric(12),
    proctor_id: null,
    scheduled_at: new Date(Date.now() + 45 * 60000).toISOString(),
    status: "scheduled",
  } satisfies IEnterpriseLmsProctoredExam.ICreate;
  const proctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: assessment.id,
        body: proctoredExamCreateBody,
      },
    );
  typia.assert(proctoredExam);

  // 5. Retrieve the proctored exam details via the GET endpoint
  const readProctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.at(
      connection,
      {
        assessmentId: assessment.id,
        proctoredExamId: proctoredExam.id,
      },
    );
  typia.assert(readProctoredExam);

  // Validate the retrieved data matches expected fields
  TestValidator.equals(
    "assessment ID matches",
    readProctoredExam.assessment_id,
    assessment.id,
  );
  TestValidator.equals(
    "proctored exam ID matches",
    readProctoredExam.id,
    proctoredExam.id,
  );
  TestValidator.equals(
    "proctored exam status matches",
    readProctoredExam.status,
    proctoredExam.status,
  );

  // 6. Authorization enforcement check
  // Create a new connection without authorization headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated GET proctored exam should be denied",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.at(
        unauthConn,
        {
          assessmentId: assessment.id,
          proctoredExamId: proctoredExam.id,
        },
      );
    },
  );

  // 7. Retrieval with invalid UUIDs should return 404 error
  await TestValidator.error(
    "invalid assessmentId should return 404",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.at(
        connection,
        {
          assessmentId: typia.random<string & tags.Format<"uuid">>(),
          proctoredExamId: proctoredExam.id,
        },
      );
    },
  );
  await TestValidator.error(
    "invalid proctoredExamId should return 404",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.at(
        connection,
        {
          assessmentId: assessment.id,
          proctoredExamId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
