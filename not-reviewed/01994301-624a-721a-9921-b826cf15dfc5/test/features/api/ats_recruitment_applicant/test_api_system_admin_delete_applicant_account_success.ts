import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that a system administrator can soft delete an applicant account.
 *
 * Steps:
 *
 * 1. Create system admin account and authenticate (get admin context)
 * 2. Create applicant account with random email
 * 3. Delete applicant via admin endpoint (should succeed, 204 response)
 * 4. Try deleting again (idempotent, should succeed with no error)
 * 5. Try deleting a random non-existent applicantId (should error)
 */
export async function test_api_system_admin_delete_applicant_account_success(
  connection: api.IConnection,
) {
  // 1. Create system admin (and set context)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin-password123!",
        name: RandomGenerator.name(),
        super_admin: false,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: "applicant-test!",
        name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);
  const applicantId = applicant.id;

  // 3. Delete applicant (admin context)
  await api.functional.atsRecruitment.systemAdmin.applicants.erase(connection, {
    applicantId: applicantId,
  });
  TestValidator.predicate(
    "first delete call does not throw error (204, void)",
    true,
  );

  // 4. Try deleting again (idempotency)
  await api.functional.atsRecruitment.systemAdmin.applicants.erase(connection, {
    applicantId: applicantId,
  });
  TestValidator.predicate(
    "second delete call does not throw error (idempotent void)",
    true,
  );

  // 5. Try deleting a random non-existent applicantId
  await TestValidator.error(
    "should throw error for non-existent applicantId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.applicants.erase(
        connection,
        { applicantId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
