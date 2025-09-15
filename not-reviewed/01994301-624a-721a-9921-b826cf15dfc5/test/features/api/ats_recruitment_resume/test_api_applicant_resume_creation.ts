import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * End-to-end test for applicant resume creation and validation scenario.
 *
 * This test covers the full business workflow for a job seeker applicant
 * registering for an account, logging in, and uploading a structured
 * resume.
 *
 * Steps:
 *
 * 1. Register a new applicant (unique email), confirm valid output.
 * 2. Log in with same credentials, verify authentication and output.
 * 3. Upload a new resume with required fields (title), plus various optional
 *    parsed fields and a sample skills_json value.
 * 4. Validate that the resume is created, all returned data matches inputs,
 *    and the resume is linked to the authenticated applicant profile.
 * 5. Attempt to upload a duplicate resume with the same title, expect error
 *    (business logic - optionally enforced at API level).
 * 6. Attempt resume upload with invalid field value (e.g., skills_json not
 *    valid JSON), expect error.
 * 7. Log out or clear auth context, attempt resume upload as unauthenticated
 *    user, expect error.
 */
export async function test_api_applicant_resume_creation(
  connection: api.IConnection,
) {
  // 1. Applicant registration
  const applicantBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IAtsRecruitmentApplicant.ICreate;
  const joinResult = await api.functional.auth.applicant.join(connection, {
    body: applicantBody,
  });
  typia.assert(joinResult);

  // 2. Login
  const loginBody = {
    email: applicantBody.email,
    password: applicantBody.password,
  } satisfies IAtsRecruitmentApplicant.ILogin;
  const loginResult = await api.functional.auth.applicant.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "login applicant ID matches join result",
    loginResult.id,
    joinResult.id,
  );

  // 3. Upload resume (success case)
  const resumeBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    parsed_name: RandomGenerator.name(),
    parsed_email: typia.random<string & tags.Format<"email">>(),
    parsed_mobile: RandomGenerator.mobile(),
    parsed_birthdate: "1991-06-01", // example birthdate
    parsed_education_summary: RandomGenerator.paragraph({ sentences: 5 }),
    parsed_experience_summary: RandomGenerator.paragraph({ sentences: 5 }),
    skills_json: JSON.stringify(["TypeScript", "Node.js", "React"]),
  } satisfies IAtsRecruitmentResume.ICreate;
  const createdResume =
    await api.functional.atsRecruitment.applicant.resumes.create(connection, {
      body: resumeBody,
    });
  typia.assert(createdResume);
  TestValidator.equals(
    "resume title matches",
    createdResume.title,
    resumeBody.title,
  );
  TestValidator.equals(
    "resume applicant linkage matches",
    createdResume.ats_recruitment_applicant_id,
    loginResult.id,
  );
  TestValidator.equals(
    "skills_json matches",
    createdResume.skills_json,
    resumeBody.skills_json,
  );

  // 4. Attempt duplicate upload (edge case)
  await TestValidator.error(
    "duplicate resume upload should fail (if title unique constraint exists)",
    async () => {
      await api.functional.atsRecruitment.applicant.resumes.create(connection, {
        body: resumeBody,
      });
    },
  );

  // 5. Invalid skills_json: non-JSON string
  const bodyInvalidSkills = {
    ...resumeBody,
    skills_json: "not a json",
  } satisfies IAtsRecruitmentResume.ICreate;
  await TestValidator.error(
    "resume upload with invalid skills_json should fail",
    async () => {
      await api.functional.atsRecruitment.applicant.resumes.create(connection, {
        body: bodyInvalidSkills,
      });
    },
  );

  // 6. Unauthenticated resume upload should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "resume upload unauthenticated should fail",
    async () => {
      await api.functional.atsRecruitment.applicant.resumes.create(unauthConn, {
        body: resumeBody,
      });
    },
  );
}
