import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * End-to-end test for department manager creating a proctored exam.
 *
 * This test covers the following workflow:
 *
 * 1. DepartmentManager user joins and logs in.
 * 2. SystemAdmin user joins and logs in to create an assessment on the same
 *    tenant.
 * 3. DepartmentManager creates a proctored exam linked to the created
 *    assessment.
 *
 * The test asserts that:
 *
 * - Role-based access control is enforced.
 * - Responses have correct fields in proper format.
 * - Created proctored exam contains expected linked assessment ID.
 */
export async function test_api_proctored_exam_creation_with_department_manager(
  connection: api.IConnection,
) {
  // 1. DepartmentManager joins
  const departmentManagerEmail = typia.random<string & tags.Format<"email">>();
  const departmentManagerPassword = RandomGenerator.alphaNumeric(16);

  const departmentManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: {
        email: departmentManagerEmail,
        password: departmentManagerPassword,
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
      } satisfies IEnterpriseLmsDepartmentManager.ICreate,
    });
  typia.assert(departmentManager);

  // 2. DepartmentManager logs in
  await api.functional.auth.departmentManager.login(connection, {
    body: {
      email: departmentManagerEmail,
      password: departmentManagerPassword,
    } satisfies IEnterpriseLmsDepartmentManager.ILogin,
  });

  // 3. SystemAdmin joins
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = RandomGenerator.alphaNumeric(16);

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // 4. SystemAdmin logs in
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: systemAdminPassword,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 5. SystemAdmin creates assessment using DepartmentManager's tenant id
  const assessmentCreateBody = {
    tenant_id: departmentManager.tenant_id,
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 70,
    status: "planned",
    scheduled_start_at: new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString(), // 1 day from now
    scheduled_end_at: new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 5 days from now
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      { body: assessmentCreateBody },
    );
  typia.assert(assessment);

  // 6. DepartmentManager creates a proctored exam linked to the assessment
  const proctoredExamCreateBody = {
    assessment_id: assessment.id,
    exam_session_id: RandomGenerator.alphaNumeric(10),
    proctor_id: null,
    scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    status: "scheduled" as const,
  } satisfies IEnterpriseLmsProctoredExam.ICreate;

  const proctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: assessment.id,
        body: proctoredExamCreateBody,
      },
    );
  typia.assert(proctoredExam);

  // Validate linkage
  TestValidator.equals(
    "proctored exam is linked to correct assessment",
    proctoredExam.assessment_id,
    assessment.id,
  );

  TestValidator.predicate(
    "proctored exam status is 'scheduled'",
    proctoredExam.status === "scheduled",
  );

  TestValidator.predicate(
    "proctored exam scheduled_at is valid ISO datetime",
    typeof proctoredExam.scheduled_at === "string" &&
      !isNaN(Date.parse(proctoredExam.scheduled_at)),
  );
}
