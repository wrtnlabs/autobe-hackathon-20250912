import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentAuditTrail";
import type { IAtsRecruitmentEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentEnum";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentAuditTrail";

/**
 * E2E: System Admin can search and filter audit trail entries by actor_id
 * and target_id.
 *
 * 1. Register (join) a new system admin and login (acquire JWT)
 * 2. As admin, create a new enum entry to get a concrete enum id for target_id
 * 3. (Warm up) Retrieve all audit trail entries (with no filters)
 *
 *    - Validate type and page result
 * 4. Query audit trails filtered by actor_id (admin's UUID)
 *
 *    - All entries returned should have actor_id === admin.id or be empty
 * 5. Query audit trails filtered by target_id (enum.id)
 *
 *    - Expect at least one entry referencing the created enum id if audit trail
 *         tracks it
 *    - If returned, each entry's target_id must match
 * 6. Query audit trails filtered by non-existent actor_id and target_id
 *    (generate unused UUID)
 *
 *    - Expect empty page (data.length === 0)
 * 7. Exercise paging and sorting (use page, limit, sort params)
 *
 *    - E.g., fetch first page, limit 1, sort by event_timestamp:desc, assert
 *         correct fields
 *
 * All logic uses only schema-defined properties and documented SDK
 * functions. Strict TypeScript and E2E assertion best practices.
 */
export async function test_api_audit_trail_search_and_filtering_by_actor_and_target(
  connection: api.IConnection,
) {
  // 1. Register a new system admin & authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin1234",
        name: RandomGenerator.name(),
        super_admin: false,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new enum entry as target entity
  const enumCreate = {
    enum_type: "test_audit_target",
    enum_code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.name(),
    extended_data: JSON.stringify({ test: true }),
    description: RandomGenerator.paragraph(),
  } satisfies IAtsRecruitmentEnum.ICreate;
  const createdEnum =
    await api.functional.atsRecruitment.systemAdmin.enums.create(connection, {
      body: enumCreate,
    });
  typia.assert(createdEnum);

  // 3. Retrieve all audit trails
  const pageAll =
    await api.functional.atsRecruitment.systemAdmin.auditTrails.index(
      connection,
      {
        body: {}, // no filters
      },
    );
  typia.assert(pageAll);
  TestValidator.predicate(
    "pageAll pagination present",
    pageAll.pagination !== undefined,
  );

  // 4. Filter by actor_id (the admin)
  const pageByActor =
    await api.functional.atsRecruitment.systemAdmin.auditTrails.index(
      connection,
      {
        body: {
          actor_id: admin.id,
        },
      },
    );
  typia.assert(pageByActor);
  if (pageByActor.data.length > 0) {
    for (const entry of pageByActor.data) {
      TestValidator.equals("audit entry by actor_id", entry.actor_id, admin.id);
    }
  }

  // 5. Filter by target_id (enum id)
  const pageByTarget =
    await api.functional.atsRecruitment.systemAdmin.auditTrails.index(
      connection,
      {
        body: {
          target_id: createdEnum.id,
        },
      },
    );
  typia.assert(pageByTarget);
  // At least zero or more entries, if some exist, check that target_id matches
  if (pageByTarget.data.length > 0) {
    for (const entry of pageByTarget.data) {
      TestValidator.equals(
        "audit entry by target_id",
        entry.target_id,
        createdEnum.id,
      );
    }
  }

  // 6. Query with non-existent actor_id and target_id (should return empty)
  const unusedUuid = typia.random<string & tags.Format<"uuid">>();
  const pageByUnusedActor =
    await api.functional.atsRecruitment.systemAdmin.auditTrails.index(
      connection,
      {
        body: {
          actor_id: unusedUuid,
        },
      },
    );
  typia.assert(pageByUnusedActor);
  TestValidator.equals(
    "No entries for unused actor_id",
    pageByUnusedActor.data.length,
    0,
  );

  const pageByUnusedTarget =
    await api.functional.atsRecruitment.systemAdmin.auditTrails.index(
      connection,
      {
        body: {
          target_id: unusedUuid,
        },
      },
    );
  typia.assert(pageByUnusedTarget);
  TestValidator.equals(
    "No entries for unused target_id",
    pageByUnusedTarget.data.length,
    0,
  );

  // 7. Test paging (limit=1, page=1), sort desc
  const pageLimit1 =
    await api.functional.atsRecruitment.systemAdmin.auditTrails.index(
      connection,
      {
        body: {
          limit: 1,
          page: 1,
          sort: "event_timestamp:desc",
        },
      },
    );
  typia.assert(pageLimit1);
  TestValidator.predicate(
    "paging with limit 1 returns at most 1",
    pageLimit1.data.length <= 1,
  );
  if (pageLimit1.data.length === 1) {
    TestValidator.equals(
      "page 1 returns first entry",
      pageLimit1.pagination.current,
      1,
    );
  }
}
