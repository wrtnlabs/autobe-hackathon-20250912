import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test retrieval of resume detail by resumeId as an applicant for privacy,
 * access, and data integrity.
 *
 * This E2E test covers the entire workflow for applicant resume detail
 * access including successful retrieval, attempts to access a non-existent
 * resume, and privacy validation so that applicants cannot obtain resumes
 * belonging to others.
 *
 * Workflow:
 *
 * 1. Register an applicant (applicantA).
 * 2. Upload a resume as applicantA, retrieve the resumeId.
 * 3. Retrieve the resume by its resumeId as applicantA and validate returned
 *    values match creation.
 * 4. Attempt to read a non-existent resumeId – expect error.
 * 5. Register a second applicant (applicantB).
 * 6. Switch session/auth to applicantB and attempt to access applicantA's
 *    resume by its ID – expect error (privacy enforced).
 */
export async function test_api_applicant_resume_detail_access_and_privacy(
  connection: api.IConnection,
) {
  // 1. Register applicantA
  const emailA = typia.random<string & tags.Format<"email">>();
  const passwordA = RandomGenerator.alphaNumeric(12);
  const applicantA = await api.functional.auth.applicant.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
      name: RandomGenerator.name(),
      phone: null,
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicantA);

  // 2. Upload a resume as applicantA
  const resumeCreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    parsed_name: RandomGenerator.name(),
    parsed_email: emailA,
    parsed_mobile: RandomGenerator.mobile(),
    parsed_birthdate: undefined,
    parsed_education_summary: undefined,
    parsed_experience_summary: undefined,
    skills_json: JSON.stringify(["TypeScript", "Node.js", "E2E Test"]),
  } satisfies IAtsRecruitmentResume.ICreate;
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    { body: resumeCreate },
  );
  typia.assert(resume);
  TestValidator.equals(
    "resume owner id is applicantA",
    resume.ats_recruitment_applicant_id,
    applicantA.id,
  );

  // 3. Retrieve the resume as applicantA
  const readResume = await api.functional.atsRecruitment.applicant.resumes.at(
    connection,
    { resumeId: resume.id },
  );
  typia.assert(readResume);
  TestValidator.equals(
    "resume is retrieved successfully",
    readResume.id,
    resume.id,
  );
  TestValidator.equals(
    "resume fields match creation",
    readResume.title,
    resumeCreate.title,
  );
  TestValidator.equals(
    "resume parsed_name matches",
    readResume.parsed_name,
    resumeCreate.parsed_name,
  );
  TestValidator.equals(
    "resume owner matches",
    readResume.ats_recruitment_applicant_id,
    applicantA.id,
  );

  // 4. Attempt retrieval with a non-existent resumeId (random uuid)
  await TestValidator.error("error on non-existent resumeId", async () => {
    await api.functional.atsRecruitment.applicant.resumes.at(connection, {
      resumeId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 5. Register applicantB
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordB = RandomGenerator.alphaNumeric(12);
  const applicantB = await api.functional.auth.applicant.join(connection, {
    body: {
      email: emailB,
      password: passwordB,
      name: RandomGenerator.name(),
      phone: null,
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicantB);

  // 6. Switch session/auth to applicantB and try to access applicantA's resume
  await TestValidator.error(
    "privacy: applicantB cannot access applicantA resume",
    async () => {
      await api.functional.atsRecruitment.applicant.resumes.at(connection, {
        resumeId: resume.id,
      });
    },
  );
}
