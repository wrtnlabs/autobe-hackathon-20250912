import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentEnum";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test updating an enum entry as a system admin, including success
 * (label/description update), failure (duplicate code, invalid id), and
 * permission checks.
 *
 * 1. Register and authenticate as a system admin.
 * 2. Create an enum value to serve as the main update target.
 * 3. Perform a valid update of label and description; verify changes.
 * 4. Create an additional enum in same enum_type, then try to update the original
 *    enum to this code—should fail due to uniqueness constraint.
 * 5. Attempt an update with an invalid (random) enumId—should fail.
 * 6. Attempt an update as an unauthorized/unauthenticated user—should fail due to
 *    permission denied.
 */
export async function test_api_enum_update_various_fields_and_permission(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPass123!",
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create main target enum entry
  const baseEnumType = RandomGenerator.alphabets(8);
  const baseEnumCode = RandomGenerator.alphaNumeric(5).toUpperCase();
  const initialEnum: IAtsRecruitmentEnum =
    await api.functional.atsRecruitment.systemAdmin.enums.create(connection, {
      body: {
        enum_type: baseEnumType,
        enum_code: baseEnumCode,
        label: RandomGenerator.name(2),
        extended_data: null,
        description: "Initial enum for update test",
      } satisfies IAtsRecruitmentEnum.ICreate,
    });
  typia.assert(initialEnum);

  // 3. Success case: update label and description
  const updatedLabel = RandomGenerator.name(2);
  const updatedDesc = RandomGenerator.paragraph({ sentences: 2 });
  const updatedEnum: IAtsRecruitmentEnum =
    await api.functional.atsRecruitment.systemAdmin.enums.update(connection, {
      enumId: initialEnum.id,
      body: {
        label: updatedLabel,
        description: updatedDesc,
      } satisfies IAtsRecruitmentEnum.IUpdate,
    });
  typia.assert(updatedEnum);
  TestValidator.equals("enum label updated", updatedEnum.label, updatedLabel);
  TestValidator.equals(
    "enum description updated",
    updatedEnum.description,
    updatedDesc,
  );

  // 4. Error: duplicate enum_code within same enum_type
  const anotherEnumCode = RandomGenerator.alphaNumeric(6).toUpperCase();
  const anotherEnum =
    await api.functional.atsRecruitment.systemAdmin.enums.create(connection, {
      body: {
        enum_type: baseEnumType,
        enum_code: anotherEnumCode,
        label: RandomGenerator.name(2),
        description: "Another enum for duplicate code test",
      } satisfies IAtsRecruitmentEnum.ICreate,
    });
  typia.assert(anotherEnum);

  await TestValidator.error(
    "cannot update to duplicate enum_code within same enum_type",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.enums.update(connection, {
        enumId: initialEnum.id,
        body: {
          enum_code: anotherEnumCode,
        } satisfies IAtsRecruitmentEnum.IUpdate,
      });
    },
  );

  // 5. Error: invalid enumId
  const invalidEnumId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("cannot update with invalid enumId", async () => {
    await api.functional.atsRecruitment.systemAdmin.enums.update(connection, {
      enumId: invalidEnumId,
      body: {
        label: "Should not update",
      } satisfies IAtsRecruitmentEnum.IUpdate,
    });
  });

  // 6. Error: unauthorized user cannot update
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot update enum",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.enums.update(unauthConn, {
        enumId: initialEnum.id,
        body: {
          label: "Attempted by unauth user",
        } satisfies IAtsRecruitmentEnum.IUpdate,
      });
    },
  );
}
