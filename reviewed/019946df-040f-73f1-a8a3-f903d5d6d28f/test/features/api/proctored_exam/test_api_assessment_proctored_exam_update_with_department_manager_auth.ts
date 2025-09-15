import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

export async function test_api_assessment_proctored_exam_update_with_department_manager_auth(
  connection: api.IConnection,
) {
  // 1. Department Manager joins and logs in
  const depManEmail = typia.random<string & tags.Format<"email">>();
  const depManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: {
        email: depManEmail,
        password: "password123",
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
      } satisfies IEnterpriseLmsDepartmentManager.ICreate,
    });
  typia.assert(depManager);

  await api.functional.auth.departmentManager.login(connection, {
    body: {
      email: depManEmail,
      password: "password123",
    } satisfies IEnterpriseLmsDepartmentManager.ILogin,
  });

  // 2. System Admin joins and logs in to create tenant
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        password_hash: "securehash",
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(sysAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password_hash: "securehash",
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 3. Organization Admin joins and logs in to create assessment
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  let orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized;
  {
    orgAdmin = await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        password: "password123",
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
        tenant_id: sysAdmin.tenant_id,
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
    typia.assert(orgAdmin);

    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: orgAdminEmail,
        password: "password123",
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  }

  // 4. Create tenant using system admin context
  const tenantName = RandomGenerator.name(2);
  const tenantCode = RandomGenerator.alphaNumeric(6);
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: tenantCode,
        name: tenantName,
      } satisfies IEnterpriseLmsTenant.ICreate,
    });
  typia.assert(tenant);

  // 5. Create assessment using organization admin context
  const assessmentCode = RandomGenerator.alphaNumeric(8);
  const assessmentTitle = `Assessment ${RandomGenerator.name(2)}`;
  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          code: assessmentCode,
          title: assessmentTitle,
          assessment_type: "quiz",
          max_score: 100,
          passing_score: 60,
          status: "planned",
          description: RandomGenerator.paragraph({ sentences: 10 }),
          scheduled_start_at: new Date(Date.now() + 3600000).toISOString(),
          scheduled_end_at: new Date(Date.now() + 7200000).toISOString(),
        } satisfies IEnterpriseLmsAssessments.ICreate,
      },
    );
  typia.assert(assessment);

  // 6. Switch back to department manager login for proctored exam creation
  await api.functional.auth.departmentManager.login(connection, {
    body: {
      email: depManEmail,
      password: "password123",
    } satisfies IEnterpriseLmsDepartmentManager.ILogin,
  });

  // 7. Create proctored exam for the assessment
  const proctoredExamToCreate: IEnterpriseLmsProctoredExam.ICreate = {
    assessment_id: assessment.id,
    exam_session_id: RandomGenerator.alphaNumeric(10),
    scheduled_at: new Date(Date.now() + 9000000).toISOString(),
    status: "scheduled",
    proctor_id: null,
  } satisfies IEnterpriseLmsProctoredExam.ICreate;

  const proctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: assessment.id,
        body: proctoredExamToCreate,
      },
    );
  typia.assert(proctoredExam);

  // 8. Update proctored exam - main test subject
  const proctoredExamUpdate: IEnterpriseLmsProctoredExam.IUpdate = {
    assessment_id: assessment.id,
    exam_session_id: `${proctoredExam.exam_session_id}_updt`,
    scheduled_at: new Date(Date.now() + 10800000).toISOString(),
    status: "in_progress",
    proctor_id: RandomGenerator.alphaNumeric(8),
  } satisfies IEnterpriseLmsProctoredExam.IUpdate;

  const updatedProctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.update(
      connection,
      {
        assessmentId: assessment.id,
        proctoredExamId: proctoredExam.id,
        body: proctoredExamUpdate,
      },
    );
  typia.assert(updatedProctoredExam);

  TestValidator.equals(
    "proctored exam updated assessment_id matches",
    updatedProctoredExam.assessment_id,
    proctoredExamUpdate.assessment_id!,
  );

  TestValidator.notEquals(
    "exam_session_id should be updated",
    updatedProctoredExam.exam_session_id,
    proctoredExam.exam_session_id,
  );

  TestValidator.equals(
    "proctor_id should be updated",
    updatedProctoredExam.proctor_id,
    proctoredExamUpdate.proctor_id,
  );

  TestValidator.equals(
    "status should be updated",
    updatedProctoredExam.status,
    proctoredExamUpdate.status,
  );

  TestValidator.predicate(
    "updated_at timestamp should be newer or equal",
    new Date(updatedProctoredExam.updated_at).getTime() >=
      new Date(proctoredExam.updated_at).getTime(),
  );

  // 9. Negative tests: Unauthorized access - simulate by logging in as different role

  // Switch to system admin login - does not have department manager access
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password_hash: "securehash",
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  await TestValidator.error(
    "system admin cannot update proctored exam - unauthorized",
    async () => {
      await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.update(
        connection,
        {
          assessmentId: assessment.id,
          proctoredExamId: proctoredExam.id,
          body: proctoredExamUpdate,
        },
      );
    },
  );

  // Switch back to department manager login
  await api.functional.auth.departmentManager.login(connection, {
    body: {
      email: depManEmail,
      password: "password123",
    } satisfies IEnterpriseLmsDepartmentManager.ILogin,
  });

  // 10. Negative tests: invalid IDs
  await TestValidator.error(
    "update fails with invalid assessmentId",
    async () => {
      await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.update(
        connection,
        {
          assessmentId: "00000000-0000-0000-0000-000000000000",
          proctoredExamId: proctoredExam.id,
          body: proctoredExamUpdate,
        },
      );
    },
  );

  await TestValidator.error(
    "update fails with invalid proctoredExamId",
    async () => {
      await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.update(
        connection,
        {
          assessmentId: assessment.id,
          proctoredExamId: "00000000-0000-0000-0000-000000000000",
          body: proctoredExamUpdate,
        },
      );
    },
  );

  // 11. Negative tests: invalid update payload scenarios
  // Note: We only test business error conditions here, not type errors
  const invalidUpdatePayloads: Array<IEnterpriseLmsProctoredExam.IUpdate> = [
    { status: "cancelled" },
    { scheduled_at: new Date(Date.now() - 3600000).toISOString() }, // past schedule
    { exam_session_id: "" },
  ];

  for (const payload of invalidUpdatePayloads) {
    await TestValidator.error(
      `invalid update payload causes failure, status: ${payload.status ?? "none"}`,
      async () => {
        await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.update(
          connection,
          {
            assessmentId: assessment.id,
            proctoredExamId: proctoredExam.id,
            body: payload,
          },
        );
      },
    );
  }
}
