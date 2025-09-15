import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate system administrator can successfully view detailed applicant
 * profile.
 *
 * This test validates that a system admin with proper authorization can
 * retrieve any applicant's full profile via GET
 * /atsRecruitment/systemAdmin/applicants/{applicantId}. The workflow is as
 * follows:
 *
 * 1. Register a new system admin using a unique email, name, and password.
 * 2. Register a new applicant with a unique email, name, password, and optional
 *    phone number.
 * 3. As system admin, retrieve the applicant profile by applicantId.
 * 4. Assert that all business fields (id, email, name, phone, is_active,
 *    created_at, updated_at, deleted_at) are correct and match registration
 *    data. Confirm no sensitive fields such as password or password_hash are
 *    present in the response.
 * 5. Edge case: Attempt to retrieve a non-existent applicantId (random uuid) and
 *    expect a handled error. All activity is traceable and logged with
 *    descriptive assertions.
 */
export async function test_api_system_admin_view_applicant_profile_success(
  connection: api.IConnection,
) {
  // Step 1: Register a system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: "StrongTestPassword1!",
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminBody,
  });
  typia.assert(adminAuth);

  // Step 2: Register an applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPhone = RandomGenerator.mobile();
  const applicantBody = {
    email: applicantEmail,
    password: "TestPassword123!",
    name: RandomGenerator.name(),
    phone: applicantPhone,
  } satisfies IAtsRecruitmentApplicant.ICreate;
  const applicantAuth = await api.functional.auth.applicant.join(connection, {
    body: applicantBody,
  });
  typia.assert(applicantAuth);

  // Step 3: As system admin, GET the applicant profile
  const applicant =
    await api.functional.atsRecruitment.systemAdmin.applicants.at(connection, {
      applicantId: applicantAuth.id,
    });
  typia.assert(applicant);
  TestValidator.equals("applicant id matches", applicant.id, applicantAuth.id);
  TestValidator.equals(
    "applicant email matches",
    applicant.email,
    applicantBody.email,
  );
  TestValidator.equals(
    "applicant name matches",
    applicant.name,
    applicantBody.name,
  );
  TestValidator.equals(
    "applicant phone matches",
    applicant.phone,
    applicantBody.phone,
  );
  TestValidator.predicate(
    "applicant is_active is boolean",
    typeof applicant.is_active === "boolean",
  );
  TestValidator.predicate(
    "applicant created_at is string",
    typeof applicant.created_at === "string",
  );
  TestValidator.predicate(
    "applicant updated_at is string",
    typeof applicant.updated_at === "string",
  );
  TestValidator.predicate(
    "no password_hash property on applicant returned object",
    (applicant as any).password_hash === undefined &&
      (applicant as any).password === undefined,
  );

  // Edge case: non-existent applicantId
  await TestValidator.error(
    "system admin GET of non-existent applicantId fails",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.applicants.at(
        connection,
        {
          applicantId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
