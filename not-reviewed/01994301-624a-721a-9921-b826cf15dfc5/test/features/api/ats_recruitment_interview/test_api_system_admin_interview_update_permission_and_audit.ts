import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_system_admin_interview_update_permission_and_audit(
  connection: api.IConnection,
) {
  /**
   * E2E test to validate updating an ATS interview as system admin, covering
   * full permission flow and business validation.
   *
   * Steps:
   *
   * 1. Register new system admin (with random email/password).
   * 2. Authenticate as system admin.
   * 3. Create a job application reference (mocked random uuid).
   * 4. Create an interview as system admin, check creation result fields.
   * 5. Update interview as system admin with all updatable fields.
   * 6. Assert updates are reflected in response and updated_at is changed.
   * 7. Try to update as non-admin (unauthenticated), confirm error is thrown.
   * 8. Business error: set forbidden status (bogus value), confirm error is
   *    thrown.
   */

  // 1. Register new system admin
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  TestValidator.predicate("system admin is active", admin.is_active === true);

  // 2. Authenticate as system admin
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);
  TestValidator.equals(
    "auth login id matches registration",
    adminLogin.id,
    admin.id,
  );

  // 3. Mock job application id for interview
  const applicationId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create interview as admin
  const interviewCreate = {
    ats_recruitment_application_id: applicationId,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    stage: "first_phase",
    status: "scheduled",
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      {
        body: interviewCreate,
      },
    );
  typia.assert(interview);
  TestValidator.equals(
    "interview.created_at stage",
    interview.stage,
    interviewCreate.stage,
  );
  TestValidator.equals(
    "interview.created_at status",
    interview.status,
    interviewCreate.status,
  );

  // 5. Update payload with all editable fields
  const updateData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    stage: "hr",
    status: "completed",
    notes: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IAtsRecruitmentInterview.IUpdate;

  // 6. Update interview
  const updated =
    await api.functional.atsRecruitment.systemAdmin.interviews.update(
      connection,
      {
        interviewId: interview.id,
        body: updateData,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "interview updated title",
    updated.title,
    updateData.title,
  );
  TestValidator.equals(
    "interview updated stage",
    updated.stage,
    updateData.stage,
  );
  TestValidator.equals(
    "interview updated status",
    updated.status,
    updateData.status,
  );
  TestValidator.equals(
    "interview updated notes",
    updated.notes,
    updateData.notes,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updated.updated_at,
    interview.updated_at,
  );

  // 7. Permission test (non-admin tries update)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin cannot update interview", async () => {
    await api.functional.atsRecruitment.systemAdmin.interviews.update(
      unauthConn,
      {
        interviewId: interview.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IAtsRecruitmentInterview.IUpdate,
      },
    );
  });

  // 8. Forbidden business value - set illegal status
  await TestValidator.error(
    "forbidden status transition rejected",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.update(
        connection,
        {
          interviewId: interview.id,
          body: {
            status: "bogus_status",
          } satisfies IAtsRecruitmentInterview.IUpdate,
        },
      );
    },
  );
}
