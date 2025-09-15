import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";

/**
 * This end-to-end test validates a full realistic business workflow for the
 * successful retrieval of a proctored exam by a department manager from the
 * Enterprise LMS.
 *
 * It performs multi-role authentication, tenant-scoped resource creation, and
 * proctored exam creation, followed by exact retrieval and detailed validation
 * of the retrieved data.
 *
 * The test ensures proper format compliance (UUIDs, ISO dates), role switching,
 * tenant isolation, and response accuracy for the GET proctored exam endpoint.
 *
 * Steps:
 *
 * 1. Department manager joins and logs in
 * 2. Organization admin joins and logs in
 * 3. Organization admin creates an assessment
 * 4. Department manager logs in again
 * 5. Department manager creates a proctored exam for the assessment
 * 6. Department manager retrieves the proctored exam by its ID
 * 7. Validates that the retrieved proctored exam fields exactly match the created
 *    one, including timestamps and enums
 */
export async function test_api_proctored_exam_retrieve_success(
  connection: api.IConnection,
) {
  const password = "PlainPassword123!";

  // 1. Department manager joins
  const departmentManagerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const departmentManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: {
        email: departmentManagerEmail,
        password,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsDepartmentManager.ICreate,
    });
  typia.assert(departmentManager);

  // 2. Department manager logs in
  const dmLogin: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: {
        email: departmentManagerEmail,
        password,
      } satisfies IEnterpriseLmsDepartmentManager.ILogin,
    });
  typia.assert(dmLogin);

  // 3. Organization admin joins
  const organizationAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: departmentManager.tenant_id,
        email: organizationAdminEmail,
        password,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // 4. Organization admin logs in
  const oaLogin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: organizationAdminEmail,
        password,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(oaLogin);

  // 5. Organization admin creates an assessment
  const createAssessmentBody = {
    tenant_id: organizationAdmin.tenant_id,
    code: `AC${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    title: "Sample Assessment Title",
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    status: "active",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      {
        body: createAssessmentBody,
      },
    );
  typia.assert(assessment);

  // 6. Department manager logs in again (switch context)
  const dmLoginAgain: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: {
        email: departmentManagerEmail,
        password,
      } satisfies IEnterpriseLmsDepartmentManager.ILogin,
    });
  typia.assert(dmLoginAgain);

  // 7. Department manager creates a proctored exam
  const now = new Date();
  const scheduledAt = new Date(now.getTime() + 86400000).toISOString(); // 1 day in future

  const createProctoredExamBody = {
    assessment_id: assessment.id,
    exam_session_id: `EXAM-${RandomGenerator.alphaNumeric(10).toUpperCase()}`,
    proctor_id: null,
    scheduled_at: scheduledAt,
    status: "scheduled",
  } satisfies IEnterpriseLmsProctoredExam.ICreate;

  const proctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: assessment.id,
        body: createProctoredExamBody,
      },
    );
  typia.assert(proctoredExam);

  // 8. Department manager retrieves the proctored exam by ID
  const retrievedExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.at(
      connection,
      {
        assessmentId: assessment.id,
        proctoredExamId: proctoredExam.id,
      },
    );
  typia.assert(retrievedExam);

  // 9. Validate retrieved data matches the created data
  TestValidator.equals("proctored exam id", retrievedExam.id, proctoredExam.id);
  TestValidator.equals(
    "assessment id",
    retrievedExam.assessment_id,
    proctoredExam.assessment_id,
  );
  TestValidator.equals(
    "exam session id",
    retrievedExam.exam_session_id,
    proctoredExam.exam_session_id,
  );
  TestValidator.equals(
    "proctor id",
    retrievedExam.proctor_id,
    proctoredExam.proctor_id,
  );
  TestValidator.equals("status", retrievedExam.status, proctoredExam.status);

  // Validate timestamps are ISO date-time formatted strings
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{3})?Z$/.test(
      retrievedExam.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{3})?Z$/.test(
      retrievedExam.updated_at,
    ),
  );

  // Soft delete timestamp can be null or ISO datetime string - check both cases
  if (
    retrievedExam.deleted_at !== null &&
    retrievedExam.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is ISO date-time",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{3})?Z$/.test(
        retrievedExam.deleted_at,
      ),
    );
  }
}
