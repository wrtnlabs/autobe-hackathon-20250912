import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentEnum";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate successful enum creation and business rule/validation errors for
 * duplicates and missing fields.
 *
 * 1. Register a new system administrator account (for authentication context)
 * 2. Create an enum entry (expect success)
 * 3. Attempt to create another enum entry with the same (enum_type, enum_code)
 *    (expect uniqueness error)
 * 4. Attempt to create with missing required fields (expect validation error)
 */
export async function test_api_enum_creation_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      super_admin: true,
    },
  });
  typia.assert(sysAdmin);

  // 2. Create enum entry (should succeed)
  const enumBody = {
    enum_type: RandomGenerator.paragraph({ sentences: 2 }),
    enum_code: RandomGenerator.paragraph({ sentences: 2 }),
    label: RandomGenerator.name(2),
    extended_data: JSON.stringify({ color: "#ff0000" }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IAtsRecruitmentEnum.ICreate;
  const enumCreated =
    await api.functional.atsRecruitment.systemAdmin.enums.create(connection, {
      body: enumBody,
    });
  typia.assert(enumCreated);
  TestValidator.equals(
    "enum_type should match",
    enumCreated.enum_type,
    enumBody.enum_type,
  );
  TestValidator.equals(
    "enum_code should match",
    enumCreated.enum_code,
    enumBody.enum_code,
  );
  TestValidator.equals("label should match", enumCreated.label, enumBody.label);
  TestValidator.equals(
    "description should match",
    enumCreated.description,
    enumBody.description,
  );

  // 3. Attempt duplicate creation (should fail business rule)
  await TestValidator.error(
    "duplicate enum_type+enum_code should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.enums.create(connection, {
        body: enumBody,
      });
    },
  );

  // 4. Attempt creation with missing required fields (e.g. no enum_type)
  // Impossible in TypeScript: purposely sending empty fields not allowed by compiler
}
