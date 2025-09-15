import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

export async function test_api_assessment_proctored_exam_update_with_corporate_learner_auth(
  connection: api.IConnection,
) {
  // 1. System Admin registration and login
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = "StrongPass123!";
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: systemAdminPassword,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 2. Tenant creation by System Admin
  const tenantCode = RandomGenerator.alphaNumeric(8);
  const tenantName = `${RandomGenerator.name(2)} Corporation`;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: tenantCode,
        name: tenantName,
      } satisfies IEnterpriseLmsTenant.ICreate,
    });
  typia.assert(tenant);

  // 3. Organization Admin registration and login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "OrgAdminPass456!";
  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: orgAdminEmail,
        password: orgAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 4. Create an assessment under the tenant scope
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const assessmentCode = RandomGenerator.alphaNumeric(6).toUpperCase();

  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          code: assessmentCode,
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          assessment_type: "quiz",
          max_score: 100,
          passing_score: 70,
          scheduled_start_at: now.toISOString(),
          scheduled_end_at: tomorrow.toISOString(),
          status: "planned",
        } satisfies IEnterpriseLmsAssessments.ICreate,
      },
    );
  typia.assert(assessment);

  // 5. Corporate Learner registration and login
  const learnerEmail = typia.random<string & tags.Format<"email">>();
  const learnerPassword = "LearnerPass789!";
  const learner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: learnerEmail,
        password: learnerPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(learner);

  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: learnerEmail,
      password: learnerPassword,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  // 6. Create a proctored exam session linked to the assessment by Corporate Learner
  const examSessionId = RandomGenerator.alphaNumeric(12).toUpperCase();
  const scheduledAt = new Date(tomorrow.getTime() + 7 * 60 * 60 * 1000); // 7 hours after tomorrow

  const proctoredExam =
    await api.functional.enterpriseLms.corporateLearner.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: assessment.id,
        body: {
          assessment_id: assessment.id,
          exam_session_id: examSessionId,
          scheduled_at: scheduledAt.toISOString(),
          status: "scheduled",
          proctor_id: null,
        } satisfies IEnterpriseLmsProctoredExam.ICreate,
      },
    );
  typia.assert(proctoredExam);

  // 7. Test unauthorized update attempt by switching to Organization Admin (unauthorized role)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  await TestValidator.error(
    "organizationAdmin role cannot update corporateLearner's proctored exam",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.assessments.proctoredExams.update(
        connection,
        {
          assessmentId: assessment.id,
          proctoredExamId: proctoredExam.id,
          body: {
            status: "cancelled",
          } satisfies IEnterpriseLmsProctoredExam.IUpdate,
        },
      );
    },
  );

  // Switch back to Corporate Learner for authorized update
  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: learnerEmail,
      password: learnerPassword,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  // 8. Valid update request changing schedule, status, and proctor id
  const updatedScheduledAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000); // 1 hour later
  const newStatus: "scheduled" | "in_progress" | "completed" | "cancelled" =
    RandomGenerator.pick(["in_progress", "completed", "cancelled"] as const);
  const newProctorId = RandomGenerator.alphaNumeric(10) || null;

  const updatedExam =
    await api.functional.enterpriseLms.corporateLearner.assessments.proctoredExams.update(
      connection,
      {
        assessmentId: assessment.id,
        proctoredExamId: proctoredExam.id,
        body: {
          scheduled_at: updatedScheduledAt.toISOString(),
          status: newStatus,
          proctor_id: newProctorId,
        } satisfies IEnterpriseLmsProctoredExam.IUpdate,
      },
    );
  typia.assert(updatedExam);

  // 9. Validate update correctness
  TestValidator.equals(
    "updated proctored exam id",
    updatedExam.id,
    proctoredExam.id,
  );
  TestValidator.equals(
    "updated proctored exam assessment id",
    updatedExam.assessment_id,
    assessment.id,
  );
  TestValidator.equals(
    "updated scheduled_at",
    updatedExam.scheduled_at,
    updatedScheduledAt.toISOString(),
  );
  TestValidator.equals("updated status", updatedExam.status, newStatus);
  TestValidator.equals(
    "updated proctor_id",
    updatedExam.proctor_id ?? null,
    newProctorId ?? null,
  );
}
