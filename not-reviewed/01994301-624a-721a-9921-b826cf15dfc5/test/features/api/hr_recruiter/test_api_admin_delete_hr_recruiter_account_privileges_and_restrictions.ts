import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate permanent HR recruiter deletion (hard delete) permissions and
 * restrictions.
 *
 * This test covers business-critical paths for permanent HR account deletion:
 *
 * 1. System admin join and login
 * 2. HR recruiter join
 * 3. Admin deletes recruiter (success case)
 * 4. Deletion effects: cannot re-delete, fetching/updating recruiter fails (if
 *    endpoints existed)
 * 5. Edge cases: non-existent id, wrong role, recruiter self-delete -- only
 *    possible roles and auth flows covered by available APIs
 * 6. Restriction business rules (cascade/min-admin) and audit log: not
 *    observable/testable, due to no additional API endpoints for those effects
 */
export async function test_api_admin_delete_hr_recruiter_account_privileges_and_restrictions(
  connection: api.IConnection,
) {
  // 1. System admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. System admin login (simulate a fresh token)
  const loggedInAdmin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IAtsRecruitmentSystemAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. HR recruiter registration
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(10);
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: recruiterEmail,
        password: recruiterPassword,
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(recruiter);

  // 4. Admin deletes recruiter
  // -- this should succeed
  await api.functional.atsRecruitment.systemAdmin.hrRecruiters.erase(
    connection,
    {
      hrRecruiterId: recruiter.id,
    },
  );

  // 5. Validate re-deleting same recruiter throws error
  await TestValidator.error("cannot delete recruiter twice", async () => {
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.erase(
      connection,
      {
        hrRecruiterId: recruiter.id,
      },
    );
  });

  // 6. Try deleting non-existent recruiter id
  await TestValidator.error(
    "delete non-existent recruiter id fails",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.hrRecruiters.erase(
        connection,
        {
          hrRecruiterId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Try deleting as unauthenticated user
  const anonymousConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot delete recruiter",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.hrRecruiters.erase(
        anonymousConn,
        {
          hrRecruiterId: recruiter.id,
        },
      );
    },
  );

  // 8. Recruiter self-delete simulation is not testable (no login endpoint for recruiter). Business rule/audit log checks not covered as no suitable API endpoints exist.
}
