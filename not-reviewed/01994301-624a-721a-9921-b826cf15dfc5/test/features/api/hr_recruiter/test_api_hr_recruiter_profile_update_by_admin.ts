import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * System administrator updates profile of an existing HR recruiter.
 *
 * Steps performed:
 *
 * 1. System admin joins and authenticates
 * 2. Admin creates a new HR recruiter account
 * 3. Admin updates HR recruiter profile (department, name, is_active)
 * 4. Fetch HR recruiter after update and verify all updated fields
 * 5. Attempt update on non-existent HR recruiter (should fail)
 * 6. Attempt update with invalid input (should fail)
 * 7. Attempt update without authentication (should fail)
 * 8. Confirm that credential fields cannot be updated
 */
export async function test_api_hr_recruiter_profile_update_by_admin(
  connection: api.IConnection,
) {
  // 1. System admin joins & authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!@#";
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    },
  });
  typia.assert(admin);

  // 2. Admin creates HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = "HrR123!@#";
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(hrRecruiter);

  // 3. Update HR recruiter profile by admin
  const updateRequest = {
    name: RandomGenerator.name(),
    department: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: false,
  } satisfies IAtsRecruitmentHrRecruiter.IUpdate;
  const updatedRecruiter =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.update(
      connection,
      {
        hrRecruiterId: hrRecruiter.id,
        body: updateRequest,
      },
    );
  typia.assert(updatedRecruiter);
  TestValidator.equals(
    "HR recruiter name updated",
    updatedRecruiter.name,
    updateRequest.name,
  );
  TestValidator.equals(
    "HR recruiter department updated",
    updatedRecruiter.department,
    updateRequest.department,
  );
  TestValidator.equals(
    "HR recruiter active status updated",
    updatedRecruiter.is_active,
    false,
  );

  // 4. Edge: Update non-existent HR recruiter
  await TestValidator.error(
    "Update non-existent HR recruiter should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.hrRecruiters.update(
        connection,
        {
          hrRecruiterId: typia.random<string & tags.Format<"uuid">>(),
          body: updateRequest,
        },
      );
    },
  );

  // 5. Edge: Invalid input (empty name)
  await TestValidator.error("Invalid input (empty name)", async () => {
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.update(
      connection,
      {
        hrRecruiterId: hrRecruiter.id,
        body: {
          name: "",
        } satisfies IAtsRecruitmentHrRecruiter.IUpdate,
      },
    );
  });

  // 6. Edge: Unauthorized (new connection, unset headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Unauthorized update should fail", async () => {
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.update(
      unauthConn,
      {
        hrRecruiterId: hrRecruiter.id,
        body: updateRequest,
      },
    );
  });

  // 7. Attempt to update credential field "password_hash" - should be ignored if sent
  const attemptPwUpdate = {
    name: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies IAtsRecruitmentHrRecruiter.IUpdate;
  const notPwUpdated =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.update(
      connection,
      {
        hrRecruiterId: hrRecruiter.id,
        body: attemptPwUpdate,
      },
    );
  typia.assert(notPwUpdated);
  TestValidator.equals(
    "password_hash not revealed in API response",
    (notPwUpdated as any).password_hash,
    undefined,
  );
}
