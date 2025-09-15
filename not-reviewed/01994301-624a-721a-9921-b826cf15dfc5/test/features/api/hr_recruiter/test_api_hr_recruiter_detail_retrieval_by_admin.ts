import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * System admin fetches HR recruiter profile details by id.
 *
 * 1. Register (join) an admin to obtain system admin privileges
 * 2. Register (join) an HR recruiter to create a profile and get valid id
 * 3. As system admin, GET /atsRecruitment/systemAdmin/hrRecruiters/{hrRecruiterId}
 *    for the recruiter
 * 4. Validate profile fields (id, email, name, department, is_active, created_at,
 *    updated_at, deleted_at)
 * 5. Confirm no password hashes or credential-sensitive fields are returned
 * 6. Edge case: fetch with non-existent UUID → expect error
 * 7. Edge case: fetch without admin authentication → expect forbidden/unauthorized
 */
export async function test_api_hr_recruiter_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminJoin = {
    email: adminEmail,
    password: adminPassword,
    name: adminName,
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoin,
  });
  typia.assert(admin);

  // 2. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(10);
  const hrName = RandomGenerator.name();
  const hrDepartment = RandomGenerator.paragraph({ sentences: 2 });
  const recruiterJoin = {
    email: hrEmail,
    password: hrPassword,
    name: hrName,
    department: hrDepartment,
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const hrAuth = await api.functional.auth.hrRecruiter.join(connection, {
    body: recruiterJoin,
  });
  typia.assert(hrAuth);

  // 3. Get detail as system admin
  const detail =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.at(
      connection,
      {
        hrRecruiterId: hrAuth.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("HR recruiter ID matches", detail.id, hrAuth.id);
  TestValidator.equals("Email matches", detail.email, recruiterJoin.email);
  TestValidator.equals("Name matches", detail.name, recruiterJoin.name);
  TestValidator.equals(
    "Department matches",
    detail.department,
    recruiterJoin.department,
  );
  TestValidator.equals("is_active is true", detail.is_active, true);
  TestValidator.predicate(
    "created_at is in ISO8601",
    typeof detail.created_at === "string" && /T.*Z$/.test(detail.created_at),
  );
  TestValidator.predicate(
    "updated_at is in ISO8601",
    typeof detail.updated_at === "string" && /T.*Z$/.test(detail.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    detail.deleted_at ?? null,
    null,
  );

  // Sensitive fields must not exist
  TestValidator.predicate(
    "No credential-sensitive fields exposed",
    !("password" in detail) &&
      !("password_hash" in detail) &&
      !("token" in detail),
  );

  // 4. Non-existent recruiter ID (not found)
  await TestValidator.error(
    "Fetching non-existent HR recruiter ID fails",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.hrRecruiters.at(
        connection,
        {
          hrRecruiterId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Cannot access if unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated admin cannot fetch HR recruiter details",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.hrRecruiters.at(
        unauthConn,
        {
          hrRecruiterId: hrAuth.id,
        },
      );
    },
  );
}
