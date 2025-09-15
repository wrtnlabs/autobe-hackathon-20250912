import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates the successful update of an applicant's profile by an HR recruiter.
 *
 * 1. Register and authenticate an HR recruiter.
 * 2. Register a new applicant and capture their ID.
 * 3. Update applicant profile fields via PUT endpoint as HR recruiter.
 * 4. Validate that the update is reflected.
 * 5. Attempt profile update using a duplicate email (should fail business logic).
 * 6. Attempt update with invalid email format (should fail business logic).
 * 7. Attempt update of a non-existent applicant (should fail business logic).
 */
export async function test_api_hr_recruiter_update_applicant_profile_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate HR recruiter
  const hrRecruiterEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrRecruiterEmail,
        password: "securePassword123",
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // 2. Create a new applicant
  const applicantCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ApplicantPassword!1",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IAtsRecruitmentApplicant.ICreate;
  const applicantAuth: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: applicantCreate,
    });
  typia.assert(applicantAuth);

  // 3. Perform profile update as HR recruiter
  const updatedFields = {
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    is_active: false,
  } satisfies IAtsRecruitmentApplicant.IUpdate;
  const updatedApplicant: IAtsRecruitmentApplicant =
    await api.functional.atsRecruitment.hrRecruiter.applicants.update(
      connection,
      {
        applicantId: applicantAuth.id,
        body: updatedFields,
      },
    );
  typia.assert(updatedApplicant);
  TestValidator.equals(
    "updated applicant name",
    updatedApplicant.name,
    updatedFields.name,
  );
  TestValidator.equals(
    "updated applicant phone",
    updatedApplicant.phone,
    updatedFields.phone,
  );
  TestValidator.equals(
    "updated applicant is_active",
    updatedApplicant.is_active,
    false,
  );

  // 4. Attempt to update using a duplicate email (should fail)
  const otherApplicantCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AnotherPassword!2",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IAtsRecruitmentApplicant.ICreate;
  const otherApplicantAuth: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: otherApplicantCreate,
    });
  typia.assert(otherApplicantAuth);

  await TestValidator.error(
    "should fail to update applicant with duplicate email",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applicants.update(
        connection,
        {
          applicantId: applicantAuth.id,
          body: {
            email: otherApplicantAuth.email,
          } satisfies IAtsRecruitmentApplicant.IUpdate,
        },
      );
    },
  );

  // 5. Attempt to update with invalid email format (should fail)
  await TestValidator.error(
    "should fail to update applicant with invalid email format",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applicants.update(
        connection,
        {
          applicantId: applicantAuth.id,
          body: {
            email: "not-an-email",
          } satisfies IAtsRecruitmentApplicant.IUpdate,
        },
      );
    },
  );

  // 6. Attempt to update a non-existent applicant (should fail)
  const nonExistentApplicantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to update non-existent applicant",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applicants.update(
        connection,
        {
          applicantId: nonExistentApplicantId,
          body: updatedFields,
        },
      );
    },
  );
}
