import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemSetting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new system configuration setting (ats_recruitment_system_settings).
 *
 * Establishes a new global configuration entry within the ATS platform by
 * inserting a row in the system settings table. Requires a unique setting_name.
 * Only authenticated system administrators may perform this operation.
 *
 * @param props - Input properties for system setting creation
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.body - Details of the system setting to create (name, value,
 *   type, description)
 * @returns The newly created system setting record with all persisted fields
 * @throws {Error} If a setting with the same setting_name already exists
 */
export async function postatsRecruitmentSystemAdminSystemSettings(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentSystemSetting.ICreate;
}): Promise<IAtsRecruitmentSystemSetting> {
  const { body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  try {
    const created =
      await MyGlobal.prisma.ats_recruitment_system_settings.create({
        data: {
          id,
          setting_name: body.setting_name,
          setting_value: body.setting_value,
          setting_type: body.setting_type,
          description: body.description ?? null,
          created_at: now,
          updated_at: now,
        },
      });
    return {
      id: created.id,
      setting_name: created.setting_name,
      setting_value: created.setting_value,
      setting_type: created.setting_type,
      description: created.description ?? undefined,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };
  } catch (err) {
    // Unique constraint violation for setting_name
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error(
        `A system setting with name '${body.setting_name}' already exists.`,
      );
    }
    throw err;
  }
}
