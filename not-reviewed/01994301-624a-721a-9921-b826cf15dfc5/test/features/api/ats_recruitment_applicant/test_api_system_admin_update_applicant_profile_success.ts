import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Verify that a system administrator can update an applicant’s profile.
 *
 * Steps:
 *
 * 1. System admin joins the platform
 * 2. Admin creates a new applicant
 * 3. Admin updates applicant (change name, phone, is_active)
 * 4. Try updating with a duplicate email to trigger unique constraint error
 * 5. Try updating a deleted or non-existent applicant to validate forbidden/error
 *    scenario
 * 6. Assert changes and error behaviors
 */
export async function test_api_system_admin_update_applicant_profile_success(
  connection: api.IConnection,
) {
  // 1. Create system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      super_admin: false,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(systemAdmin);

  // 2. Create two applicant accounts
  const applicant1Email = typia.random<string & tags.Format<"email">>();
  const applicant1 = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicant1Email,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant1);

  const applicant2Email = typia.random<string & tags.Format<"email">>();
  const applicant2 = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicant2Email,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant2);

  // 3. System admin updates applicant1's profile (name, phone, is_active)
  const updatedName = RandomGenerator.name();
  const updatedPhone = RandomGenerator.mobile();
  const updatedApplicant =
    await api.functional.atsRecruitment.systemAdmin.applicants.update(
      connection,
      {
        applicantId: applicant1.id,
        body: {
          name: updatedName,
          phone: updatedPhone,
          is_active: false,
        } satisfies IAtsRecruitmentApplicant.IUpdate,
      },
    );
  typia.assert(updatedApplicant);
  TestValidator.equals("name was updated", updatedApplicant.name, updatedName);
  TestValidator.equals(
    "phone was updated",
    updatedApplicant.phone,
    updatedPhone,
  );
  TestValidator.equals("is_active updated", updatedApplicant.is_active, false);
  TestValidator.equals(
    "email not changed",
    updatedApplicant.email,
    applicant1.email,
  );
  TestValidator.equals("id not changed", updatedApplicant.id, applicant1.id);

  // 4. Attempt to update with a duplicate email (should error)
  await TestValidator.error("duplicate email not allowed", async () => {
    await api.functional.atsRecruitment.systemAdmin.applicants.update(
      connection,
      {
        applicantId: applicant1.id,
        body: {
          email: applicant2.email,
        } satisfies IAtsRecruitmentApplicant.IUpdate,
      },
    );
  });

  // 5. Attempt to update a deleted/non-existent applicant (should error)
  const fakeApplicantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating deleted/non-existent applicant should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.applicants.update(
        connection,
        {
          applicantId: fakeApplicantId,
          body: { name: "Ghost" } satisfies IAtsRecruitmentApplicant.IUpdate,
        },
      );
    },
  );
}
