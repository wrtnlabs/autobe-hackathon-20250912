import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentEnum";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that a system admin can view detailed information of a created enum,
 * handles not found and unauthorized access gracefully.
 *
 * 1. Register a new system admin (POST /auth/systemAdmin/join)
 * 2. Login as system admin (POST /auth/systemAdmin/login) to ensure authenticated
 *    context
 * 3. Create new ATS enum (POST /atsRecruitment/systemAdmin/enums) and extract
 *    enumId
 * 4. Retrieve that enum by ID (GET /atsRecruitment/systemAdmin/enums/{enumId}) and
 *    validate all returned fields using typia.assert.
 * 5. Attempt to GET a random (nonexistent) enumId to ensure not found error (using
 *    TestValidator.error)
 * 6. Attempt to GET as an unauthenticated user to ensure access is forbidden (by
 *    using a fresh connection with empty headers)
 */
export async function test_api_enum_detail_view_and_not_found_handling(
  connection: api.IConnection,
) {
  // 1. Register new system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinOutput = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(joinOutput);

  // 2. Login as admin (for authentication context)
  const loginOutput = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  typia.assert(loginOutput);

  // 3. Create a new ATS recruitment enum
  const enumInput = {
    enum_type: RandomGenerator.paragraph({ sentences: 1 }),
    enum_code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 1 }),
    extended_data: JSON.stringify({ color: "#4287f5" }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IAtsRecruitmentEnum.ICreate;
  const createdEnum =
    await api.functional.atsRecruitment.systemAdmin.enums.create(connection, {
      body: enumInput,
    });
  typia.assert(createdEnum);

  // 4. Retrieve enum by its ID and validate all fields
  const result = await api.functional.atsRecruitment.systemAdmin.enums.at(
    connection,
    {
      enumId: createdEnum.id,
    },
  );
  typia.assert(result);
  TestValidator.equals(
    "returned enumType matches input",
    result.enum_type,
    enumInput.enum_type,
  );
  TestValidator.equals(
    "returned enumCode matches input",
    result.enum_code,
    enumInput.enum_code,
  );
  TestValidator.equals(
    "returned label matches input",
    result.label,
    enumInput.label,
  );
  TestValidator.equals(
    "returned extended_data matches input",
    result.extended_data,
    enumInput.extended_data,
  );
  TestValidator.equals(
    "returned description matches input",
    result.description,
    enumInput.description,
  );
  TestValidator.predicate(
    "created_at is ISO8601 format",
    typeof result.created_at === "string" && result.created_at.endsWith("Z"),
  );
  TestValidator.predicate(
    "updated_at is ISO8601 format",
    typeof result.updated_at === "string" && result.updated_at.endsWith("Z"),
  );

  // 5. Not found: try random UUID (should get error)
  const randomEnumId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw not found for nonexistent enumId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.enums.at(connection, {
        enumId: randomEnumId,
      });
    },
  );

  // 6. Unauthorized: try GET enum as unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should throw forbidden for unauthenticated access",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.enums.at(unauthConn, {
        enumId: createdEnum.id,
      });
    },
  );
}
