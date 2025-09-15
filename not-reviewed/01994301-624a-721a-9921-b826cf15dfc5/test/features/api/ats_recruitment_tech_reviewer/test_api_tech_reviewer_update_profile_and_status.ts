import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates updating the profile and activation status of a technical
 * reviewer by a system administrator.
 *
 * Workflow:
 *
 * 1. Register a new system administrator using systemAdmin.join and
 *    authenticate as systemAdmin.
 * 2. Create two tech reviewer accounts (for duplication test later) using
 *    techReviewer.join, storing their IDs and emails.
 * 3. As systemAdmin (remain authenticated), update the first tech reviewer by
 *    ID via the systemAdmin.techReviewers.update API.
 *
 *    - Change name, email, specialization, and is_active to distinct new values
 * 4. Retrieve the updated reviewer with systemAdmin.techReviewers.at and
 *    assert changes took effect (email, name, specialization, is_active).
 * 5. Attempt to update reviewer 1's email to reviewer 2's existing email and
 *    assert business error occurs (duplicate email).
 * 6. Authenticate as techReviewer, try to update their own profile using the
 *    systemAdmin endpoint, and assert error due to permission.
 */
export async function test_api_tech_reviewer_update_profile_and_status(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as system administrator
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdmin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        password: "secureadminpass!1",
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(sysAdmin);

  // Step 2: Create two technical reviewers
  const reviewer1Email = typia.random<string & tags.Format<"email">>();
  const reviewer2Email = typia.random<string & tags.Format<"email">>();
  const reviewer1: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: reviewer1Email,
        password: "techrev1pass!1",
        name: RandomGenerator.name(),
        specialization: "Backend",
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    });
  typia.assert(reviewer1);

  const reviewer2: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: reviewer2Email,
        password: "techrev2pass!1",
        name: RandomGenerator.name(),
        specialization: "DevOps",
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    });
  typia.assert(reviewer2);

  // Step 3: As systemAdmin, update reviewer1's profile fields using admin endpoint
  // Prepare new values (ensure email does not conflict)
  const newReviewer1Email = typia.random<string & tags.Format<"email">>();
  const updatedName = RandomGenerator.name();
  const updatedSpecialization = RandomGenerator.pick([
    "Cloud",
    "Security",
    "Frontend",
  ] as const);
  const updatedIsActive = false;
  const updatedReviewer: IAtsRecruitmentTechReviewer =
    await api.functional.atsRecruitment.systemAdmin.techReviewers.update(
      connection,
      {
        techReviewerId: reviewer1.id,
        body: {
          email: newReviewer1Email,
          name: updatedName,
          specialization: updatedSpecialization,
          is_active: updatedIsActive,
        } satisfies IAtsRecruitmentTechReviewer.IUpdate,
      },
    );
  typia.assert(updatedReviewer);
  TestValidator.equals(
    "reviewer email updated",
    updatedReviewer.email,
    newReviewer1Email,
  );
  TestValidator.equals(
    "reviewer name updated",
    updatedReviewer.name,
    updatedName,
  );
  TestValidator.equals(
    "reviewer specialization updated",
    updatedReviewer.specialization,
    updatedSpecialization,
  );
  TestValidator.equals(
    "reviewer is_active updated",
    updatedReviewer.is_active,
    updatedIsActive,
  );

  // Step 4: Fetch the updated reviewer and verify changes
  const read: IAtsRecruitmentTechReviewer =
    await api.functional.atsRecruitment.systemAdmin.techReviewers.at(
      connection,
      {
        techReviewerId: reviewer1.id,
      },
    );
  typia.assert(read);
  TestValidator.equals(
    "fetched reviewer email matches",
    read.email,
    newReviewer1Email,
  );
  TestValidator.equals("fetched reviewer name matches", read.name, updatedName);
  TestValidator.equals(
    "fetched reviewer specialization matches",
    read.specialization,
    updatedSpecialization,
  );
  TestValidator.equals(
    "fetched reviewer is_active matches",
    read.is_active,
    updatedIsActive,
  );

  // Step 5: Attempt to update with duplicate email (should fail)
  await TestValidator.error(
    "updating to duplicate email should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.techReviewers.update(
        connection,
        {
          techReviewerId: reviewer1.id,
          body: {
            email: reviewer2Email,
          } satisfies IAtsRecruitmentTechReviewer.IUpdate,
        },
      );
    },
  );

  // Step 6: Authenticate as techReviewer (reviewer1), try to update using admin endpoint (should fail)
  await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: newReviewer1Email,
      password: "techrev1pass!1",
      name: updatedName,
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  await TestValidator.error(
    "tech reviewer cannot update via admin endpoint",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.techReviewers.update(
        connection,
        {
          techReviewerId: reviewer1.id,
          body: {
            name: "Hacker Name",
          } satisfies IAtsRecruitmentTechReviewer.IUpdate,
        },
      );
    },
  );
}
