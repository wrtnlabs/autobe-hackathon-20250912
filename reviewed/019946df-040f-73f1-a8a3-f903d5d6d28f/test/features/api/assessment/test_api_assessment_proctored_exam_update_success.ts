import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

export async function test_api_assessment_proctored_exam_update_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate system admin user (join)
  // 2. Create tenant organization
  // 3. Create assessment under tenant
  // 4. Create proctored exam session under assessment
  // 5. Attempt to update proctored exam unauthenticated and expect failure
  // 6. Attempt to update proctored exam with unauthorized role and expect failure
  // 7. Update proctored exam with valid authorized systemAdmin role
  // 8. Validate updated data correctness including timestamps and status

  // 1. System Admin join and authenticate
  const systemAdminCreate = {
    email: `sysadmin+${RandomGenerator.alphaNumeric(5)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: systemAdminCreate,
  });
  typia.assert(systemAdmin);

  // 2. Create tenant organization
  const tenantCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant = await api.functional.enterpriseLms.systemAdmin.tenants.create(
    connection,
    {
      body: tenantCreate,
    },
  );
  typia.assert(tenant);

  // 3. Create assessment under tenant
  const assessmentCreate = {
    tenant_id: tenant.id,
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    assessment_type: "quiz",
    max_score: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    passing_score: 0,
    scheduled_start_at: new Date(Date.now() + 3600000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 7200000).toISOString(),
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessment =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      {
        body: assessmentCreate,
      },
    );
  typia.assert(assessment);

  // 4. Create proctored exam session under assessment
  const proctoredExamCreate = {
    assessment_id: assessment.id,
    exam_session_id: RandomGenerator.alphaNumeric(10),
    proctor_id: null,
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    status: "scheduled",
  } satisfies IEnterpriseLmsProctoredExam.ICreate;

  const proctoredExam =
    await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: assessment.id,
        body: proctoredExamCreate,
      },
    );
  typia.assert(proctoredExam);

  // 5. Attempt update with unauthenticated connection - expect error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated update attempt should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.update(
        unauthenticatedConnection,
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

  // 6. Attempt update with unauthorized role (simulate by creating a new join with status 'inactive')
  const inactiveAdminCreate = {
    email: `inactive+${RandomGenerator.alphaNumeric(5)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "inactive",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const inactiveAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: inactiveAdminCreate,
  });
  typia.assert(inactiveAdmin);

  await TestValidator.error(
    "inactive user update attempt should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.update(
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

  // 7. Update with authorized system admin
  // Switch back to active systemAdmin context (join again to refresh token)
  const systemAdmin2 = await api.functional.auth.systemAdmin.join(connection, {
    body: systemAdminCreate,
  });
  typia.assert(systemAdmin2);

  const updatedScheduledAt = new Date(Date.now() + 5400000).toISOString(); // 1.5 hours from now
  const updatedProctorId = RandomGenerator.alphaNumeric(8);
  const updateBody = {
    scheduled_at: updatedScheduledAt,
    proctor_id: updatedProctorId,
    status: "in_progress",
  } satisfies IEnterpriseLmsProctoredExam.IUpdate;

  const updatedProctoredExam =
    await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.update(
      connection,
      {
        assessmentId: assessment.id,
        proctoredExamId: proctoredExam.id,
        body: updateBody,
      },
    );
  typia.assert(updatedProctoredExam);

  // 8. Validate updated data correctness
  TestValidator.equals(
    "proctored exam id remains same",
    updatedProctoredExam.id,
    proctoredExam.id,
  );
  TestValidator.equals(
    "assessment id remains same",
    updatedProctoredExam.assessment_id,
    assessment.id,
  );
  TestValidator.equals(
    "proctor id updated",
    updatedProctoredExam.proctor_id,
    updatedProctorId,
  );
  TestValidator.equals(
    "status updated",
    updatedProctoredExam.status,
    "in_progress",
  );
  TestValidator.predicate(
    "scheduled_at is updated",
    updatedProctoredExam.scheduled_at === updatedScheduledAt,
  );
  TestValidator.predicate(
    "updated_at is updated",
    new Date(updatedProctoredExam.updated_at).getTime() >=
      new Date(proctoredExam.updated_at).getTime(),
  );
}
