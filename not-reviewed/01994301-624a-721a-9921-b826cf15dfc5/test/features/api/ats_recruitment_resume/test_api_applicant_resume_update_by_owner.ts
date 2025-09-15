import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Complete E2E test for applicant updating their own resume metadata
 *
 * This test validates the applicant journey:
 *
 * 1. Applicant signup (auth.applicant.join)
 * 2. Applicant login (auth.applicant.login) to ensure valid session
 * 3. Create a new resume (atsRecruitment.applicant.resumes.create) as the
 *    applicant
 * 4. Update the resume with new metadata
 *    (atsRecruitment.applicant.resumes.update) as the same applicant
 * 5. Assert the resume is updated (fields changed; others unchanged)
 * 6. Test edge case: attempt to update with invalid data (expect error)
 * 7. Test edge case: attempt to update a non-existent resumeId (expect error)
 * 8. Test edge case: another applicant attempts to update the resume (expect
 *    error)
 */
export async function test_api_applicant_resume_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicantName = RandomGenerator.name();
  const applicantPhone = RandomGenerator.mobile();
  const authorized = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: applicantName,
      phone: applicantPhone,
    },
  });
  typia.assert(authorized);

  // 2. Login applicant
  await api.functional.auth.applicant.login(connection, {
    body: { email: applicantEmail, password: applicantPassword },
  });

  // 3. Create initial resume
  const createResumeBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    parsed_name: applicantName,
    parsed_email: applicantEmail,
    parsed_mobile: applicantPhone,
    skills_json: JSON.stringify(["typescript", "node.js", "jest"]),
  } satisfies IAtsRecruitmentResume.ICreate;
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    { body: createResumeBody },
  );
  typia.assert(resume);
  TestValidator.equals(
    "resume title matches on creation",
    resume.title,
    createResumeBody.title,
  );
  TestValidator.equals(
    "skills match on creation",
    resume.skills_json,
    createResumeBody.skills_json,
  );

  // 4. Update resume (change several fields, keep others the same, add new skills)
  const updateResumeBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    parsed_education_summary: "MIT BSc Computer Science",
    parsed_experience_summary: "Software Engineer at TestCo 2020-2023",
    skills_json: JSON.stringify(["typescript", "react", "next.js"]),
  } satisfies IAtsRecruitmentResume.IUpdate;
  const updated = await api.functional.atsRecruitment.applicant.resumes.update(
    connection,
    {
      resumeId: resume.id,
      body: updateResumeBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "title was updated",
    updated.title,
    updateResumeBody.title,
  );
  TestValidator.equals(
    "education updated",
    updated.parsed_education_summary,
    updateResumeBody.parsed_education_summary,
  );
  TestValidator.equals(
    "experience updated",
    updated.parsed_experience_summary,
    updateResumeBody.parsed_experience_summary,
  );
  TestValidator.equals(
    "skills_json updated",
    updated.skills_json,
    updateResumeBody.skills_json,
  );
  // unchanged fields
  TestValidator.equals(
    "owner unchanged after update",
    updated.ats_recruitment_applicant_id,
    resume.ats_recruitment_applicant_id,
  );
  TestValidator.equals(
    "parsed_email unchanged after update",
    updated.parsed_email,
    resume.parsed_email,
  );

  // 5. Edge case: invalid update data (title empty string, expect error)
  await TestValidator.error("update should fail with empty title", async () => {
    await api.functional.atsRecruitment.applicant.resumes.update(connection, {
      resumeId: resume.id,
      body: {
        title: "",
      } satisfies IAtsRecruitmentResume.IUpdate,
    });
  });

  // 6. Edge case: update non-existent resumeId
  await TestValidator.error(
    "updating non-existent resume should fail",
    async () => {
      await api.functional.atsRecruitment.applicant.resumes.update(connection, {
        resumeId: typia.random<string & tags.Format<"uuid">>(),
        body: updateResumeBody,
      });
    },
  );

  // 7. Edge case: update as another applicant (ownership/authorization error)
  // Register another applicant
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = RandomGenerator.alphaNumeric(10);
  const otherName = RandomGenerator.name();
  const otherPhone = RandomGenerator.mobile();
  await api.functional.auth.applicant.join(connection, {
    body: {
      email: otherEmail,
      password: otherPassword,
      name: otherName,
      phone: otherPhone,
    },
  });
  // Login as different applicant
  await api.functional.auth.applicant.login(connection, {
    body: { email: otherEmail, password: otherPassword },
  });
  await TestValidator.error(
    "another applicant cannot update resume they do not own",
    async () => {
      await api.functional.atsRecruitment.applicant.resumes.update(connection, {
        resumeId: resume.id,
        body: updateResumeBody,
      });
    },
  );
}
