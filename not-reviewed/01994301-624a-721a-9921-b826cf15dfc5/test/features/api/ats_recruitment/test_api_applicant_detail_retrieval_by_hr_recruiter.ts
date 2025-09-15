import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test retrieving a detailed applicant profile by applicantId as an HR
 * recruiter.
 *
 * 1. Register a HR recruiter
 * 2. Login as the HR recruiter
 * 3. Create an applicant
 * 4. Retrieve the applicant using applicantId as HR recruiter; validate all
 *    fields.
 * 5. Try to retrieve with a non-existent applicantId (should error).
 */
export async function test_api_applicant_detail_retrieval_by_hr_recruiter(
  connection: api.IConnection,
) {
  // 1. Register a HR recruiter
  const hrEmail: string = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(10);
  const hrName = RandomGenerator.name();
  const hrDepartment = RandomGenerator.name();

  const hrJoin: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: hrName,
        department: hrDepartment,
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrJoin);

  // 2. Authenticate (login) as the HR recruiter
  const hrLogin: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.login(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
      } satisfies IAtsRecruitmentHrRecruiter.ILogin,
    });
  typia.assert(hrLogin);

  // 3. Register an applicant
  const applicantEmail: string = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantName = RandomGenerator.name();
  const applicantPhone = RandomGenerator.mobile();
  const applicantJoin: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: applicantName,
        phone: applicantPhone,
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicantJoin);

  // 4. Retrieve applicant details as HR recruiter
  const applicant: IAtsRecruitmentApplicant =
    await api.functional.atsRecruitment.hrRecruiter.applicants.at(connection, {
      applicantId: applicantJoin.id,
    });
  typia.assert(applicant);

  // Validate all basic fields match created applicant (except created_at/updated_at)
  TestValidator.equals(
    "applicant email matches",
    applicant.email,
    applicantEmail,
  );
  TestValidator.equals("applicant name matches", applicant.name, applicantName);
  TestValidator.equals(
    "applicant phone matches",
    applicant.phone,
    applicantPhone,
  );
  TestValidator.predicate(
    "applicant ID matches",
    applicant.id === applicantJoin.id,
  );
  TestValidator.predicate("applicant is active", applicant.is_active === true);
  TestValidator.predicate(
    "created_at and updated_at are ISO date-time",
    typeof applicant.created_at === "string" &&
      !!/\d{4}-\d{2}-\d{2}T\d{2}:.+Z$/.test(applicant.created_at) &&
      typeof applicant.updated_at === "string" &&
      !!/\d{4}-\d{2}-\d{2}T\d{2}:.+Z$/.test(applicant.updated_at),
  );

  // 5. Query with non-existent applicantId
  const invalidApplicantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "retrieving non-existent applicant should error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applicants.at(
        connection,
        {
          applicantId: invalidApplicantId,
        },
      );
    },
  );
}
