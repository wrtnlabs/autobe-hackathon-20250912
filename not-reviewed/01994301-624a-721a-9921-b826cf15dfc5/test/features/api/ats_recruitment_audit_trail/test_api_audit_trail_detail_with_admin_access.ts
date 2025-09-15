import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentAuditTrail";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test detailed audit trail retrieval by a system admin.
 *
 * Scenario:
 *
 * 1. Register and authenticate as a new admin. This registration creates an audit
 *    log entry, but as there is currently no API to list audit records, we
 *    can't retrieve a valid id for positive testing.
 * 2. Negative test: Attempt to fetch an audit trail record by a random
 *    (unlikely-to-exist) auditTrailId, asserting that the operation fails (not
 *    found).
 * 3. [If an audit trail index API becomes present, retrieve an auditTrailId for
 *    positive path, fetch it, validate fields and proper actor id, etc.]
 */
export async function test_api_audit_trail_detail_with_admin_access(
  connection: api.IConnection,
) {
  // 1. Create a new admin (registration also performs authentication)
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(14),
    name: RandomGenerator.name(),
    super_admin: RandomGenerator.pick([true, false] as const),
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // 2. Negative case: Lookup by a random auditTrailId should fail (not found or forbidden)
  const nonexistentAuditTrailId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching nonexistent auditTrailId should throw",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.auditTrails.at(
        connection,
        { auditTrailId: nonexistentAuditTrailId },
      );
    },
  );

  // 3. [Positive test would: list audit trails, get a real auditTrailId, fetch and assert the detailed record]
}
