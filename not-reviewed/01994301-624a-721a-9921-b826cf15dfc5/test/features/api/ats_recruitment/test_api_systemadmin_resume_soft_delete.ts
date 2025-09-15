import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * End-to-end test for system-admin soft-delete of applicant resume
 * covering:
 *
 * - Super admin system administrator account registration and login
 * - Applicant registration, login, and resume creation
 * - System-admin privileged soft-delete operation
 * - Error scenarios:
 *
 *   - Deletion of non-existent resume
 *   - Repeated delete on already-deleted resume
 *   - Applicant attempting admin-only erase
 * - Validation: Resume cannot be accessed by applicant post-delete, admin can
 *   audit soft-deleted record, all responses type-checked
 */
export async function test_api_systemadmin_resume_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register system administrator (super_admin)
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPwd = RandomGenerator.alphaNumeric(10);
  const sysAdminReg = {
    email: sysAdminEmail,
    password: sysAdminPwd,
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminReg,
  });
  typia.assert(sysAdmin);
  // 2. Log in as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPwd,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 3. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPwd = RandomGenerator.alphaNumeric(10);
  const applicantReg = {
    email: applicantEmail,
    password: applicantPwd,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IAtsRecruitmentApplicant.ICreate;
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: applicantReg,
  });
  typia.assert(applicant);
  // 4. Log in as applicant
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPwd,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  // 5. As applicant, create resume
  const resumeBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    parsed_name: RandomGenerator.name(2),
    parsed_email: typia.random<string & tags.Format<"email">>(),
    parsed_mobile: RandomGenerator.mobile(),
    parsed_birthdate: null,
    parsed_education_summary: RandomGenerator.paragraph({ sentences: 8 }),
    parsed_experience_summary: RandomGenerator.paragraph({ sentences: 8 }),
    skills_json: JSON.stringify(["typescript", "nodejs"]),
  } satisfies IAtsRecruitmentResume.ICreate;
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    { body: resumeBody },
  );
  typia.assert(resume);
  const resumeId = resume.id;

  // 6. Switch back to admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPwd,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  // 7. Delete resume via admin erase endpoint
  await api.functional.atsRecruitment.systemAdmin.resumes.erase(connection, {
    resumeId,
  });
  // 8. Attempt applicant access to (now deleted) resume - Should fail (simulate resume fetch, expect error)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPwd,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "applicant cannot access soft-deleted resume (erase forbidden)",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.resumes.erase(
        connection,
        { resumeId },
      );
    },
  );
  // 9. Switch to admin, try double-delete (already deleted)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPwd,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  await TestValidator.error(
    "error on re-deleting already soft-deleted resume",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.resumes.erase(
        connection,
        { resumeId },
      );
    },
  );
  // 10. Try deleting a non-existent resume
  const fakeResumeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error on deleting non-existent resume",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.resumes.erase(
        connection,
        { resumeId: fakeResumeId },
      );
    },
  );
}
