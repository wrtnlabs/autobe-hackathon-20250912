import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_applicant_resume_soft_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and log in first applicant (will own the resume)
  const applicant1Email: string = typia.random<string & tags.Format<"email">>();
  const applicant1Password: string = RandomGenerator.alphaNumeric(12);
  const applicant1JoinBody = {
    email: applicant1Email,
    password: applicant1Password,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IAtsRecruitmentApplicant.ICreate;
  const applicant1 = await api.functional.auth.applicant.join(connection, {
    body: applicant1JoinBody,
  });
  typia.assert(applicant1);

  // 2. Create a resume as applicant1
  const resumeCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    parsed_name: RandomGenerator.name(),
    parsed_email: typia.random<string & tags.Format<"email">>(),
    parsed_mobile: RandomGenerator.mobile(),
    parsed_birthdate: null,
    parsed_education_summary: RandomGenerator.paragraph({ sentences: 4 }),
    parsed_experience_summary: RandomGenerator.paragraph({ sentences: 6 }),
    skills_json: JSON.stringify(["TypeScript", "Node.js", "React"]),
  } satisfies IAtsRecruitmentResume.ICreate;
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    { body: resumeCreateBody },
  );
  typia.assert(resume);

  // 3. Soft-delete the resume by applicant1 (the owner)
  await api.functional.atsRecruitment.applicant.resumes.erase(connection, {
    resumeId: resume.id,
  });
  // (Assume listing resumes would not show deleted resumes; can't check here since no list API provided)

  // 4. Register and log in a second applicant (not the owner)
  const applicant2Email: string = typia.random<string & tags.Format<"email">>();
  const applicant2Password: string = RandomGenerator.alphaNumeric(12);
  const applicant2JoinBody = {
    email: applicant2Email,
    password: applicant2Password,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IAtsRecruitmentApplicant.ICreate;
  const applicant2 = await api.functional.auth.applicant.join(connection, {
    body: applicant2JoinBody,
  });
  typia.assert(applicant2);

  // 5. Attempt to delete the first resume as applicant2: should reject (403/unauthorized)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicant2Email,
      password: applicant2Password,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error("non-owner cannot delete resume", async () => {
    await api.functional.atsRecruitment.applicant.resumes.erase(connection, {
      resumeId: resume.id,
    });
  });

  // 6. Attempt to delete a non-existent/garbage resumeId: should reject
  const randomNonexistentResumeId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("delete non-existent resume fails", async () => {
    await api.functional.atsRecruitment.applicant.resumes.erase(connection, {
      resumeId: randomNonexistentResumeId,
    });
  });

  // 7. Attempt to delete again the already-soft-deleted resume: should reject
  await TestValidator.error("delete already-deleted resume fails", async () => {
    await api.functional.atsRecruitment.applicant.resumes.erase(connection, {
      resumeId: resume.id,
    });
  });

  // 8. Attempt to delete without login (unauthenticated): should reject
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot delete resume",
    async () => {
      await api.functional.atsRecruitment.applicant.resumes.erase(unauthConn, {
        resumeId: resume.id,
      });
    },
  );
}
